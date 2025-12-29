import { astMapper, astVisitor, parse, toSql } from 'pgsql-ast-parser'
import type {
  Expr,
  ExprBinary,
  ExprInteger,
  ExprTernary,
  BinaryOperator,
  SelectFromStatement,
  SelectStatement,
  Statement,
} from 'pgsql-ast-parser'

import { getCatalogAllowlist, type CatalogAllowlist } from './catalog'

export const DEFAULT_LIMIT = 200
export const HARD_LIMIT = 1000
export const QUERY_TIMEOUT_MS = 2000
export const MAX_PREVIEW_ROWS = 20

const FORBIDDEN_KEYWORDS = [
  'insert',
  'update',
  'delete',
  'drop',
  'alter',
  'create',
  'grant',
  'revoke',
  'copy',
  'vacuum',
  'truncate',
]

const FORBIDDEN_FUNCTIONS = new Set([
  'pg_read_file',
  'pg_read_binary_file',
  'pg_ls_dir',
  'pg_sleep',
  'pg_stat_file',
  'pg_database_size',
])

const ALLOWED_STRING_LITERALS = new Set([
  'day',
  'week',
  'month',
  'year',
  'push%',
  'pull%',
  'leg%',
])
const INTERVAL_LITERAL_REGEX = /^\d+\s+(day|days|week|weeks|month|months|year|years)$/i
const COMPARISON_OPERATORS = new Set<BinaryOperator>(['=', '!=', '>', '>=', '<', '<='])

const DATE_COLUMNS = new Set<string>(['date', 'timestamp'])
const VIRTUAL_COLUMNS = new Set<string>(['body_part'])
const POLICY_HINT_REGEX = /^\s*\/\*policy:([\s\S]*?)\*\/\s*/i

type PolicyHints = {
  timeWindow?: 'all_time'
}

type TableRef = { name: string; alias?: string | null }

type ValidationSummary = {
  tables: TableRef[]
  cteAliases: Set<string>
  hasDateFilter: boolean
  isTrendQuery: boolean
}

const parsePolicyHints = (segment: string): PolicyHints => {
  const hints: PolicyHints = {}
  segment
    .split(';')
    .map(entry => entry.trim())
    .filter(Boolean)
    .forEach(entry => {
      const [keyPart, valuePart] = entry.split('=')
      if (!keyPart || !valuePart) return
      const rawKey = keyPart.trim().toLowerCase()
      const rawValue = valuePart.trim().toLowerCase()
      if (!rawKey || !rawValue) return
      if (rawKey === 'time_window' && rawValue === 'all_time') {
        hints.timeWindow = 'all_time'
      }
    })
  return hints
}

const stripPolicyHints = (sql: string): { sql: string; hints: PolicyHints } => {
  const match = sql.match(POLICY_HINT_REGEX)
  if (!match) {
    return { sql, hints: {} }
  }
  const hints = parsePolicyHints(match[1])
  const remainder = sql.slice(match[0].length)
  return { sql: remainder.trimStart(), hints }
}

export type SqlPolicyResult = {
  sql: string
  params: unknown[]
  appliedLimit: number
  appliedTimeWindow: '90 days' | '12 months' | 'all_time' | null
}

const normalizeName = (value: string) => value.trim().toLowerCase()

const isSystemSchema = (schema?: string | null) => {
  if (!schema) return false
  const s = normalizeName(schema)
  return s === 'pg_catalog' || s === 'information_schema' || s.startsWith('pg_')
}

const getQNameSchema = (qname?: { schema?: string | null } | null) =>
  qname?.schema ? normalizeName(qname.schema) : ''

const ensureAllowedKeywordUsage = (sql: string) => {
  const lowered = sql.toLowerCase()
  for (const keyword of FORBIDDEN_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'i')
    if (pattern.test(lowered)) {
      throw new Error(`Unsafe keyword detected: ${keyword}`)
    }
  }
}

const ensureSingleSelect = (statement: Statement): SelectStatement => {
  if (statement.type === 'select' || statement.type === 'with') return statement
  throw new Error('Only SELECT or WITH ... SELECT statements are allowed.')
}

const ensureNoUnionOrValues = (statement: SelectStatement) => {
  if (statement.type === 'select') return
  if (statement.type === 'with') return
  throw new Error('UNION, VALUES, and recursive queries are not allowed.')
}

const isBodyPartsRef = (expr: Expr): boolean => {
  if (expr.type === 'ref') {
    return normalizeName(expr.name) === 'body_parts'
  }
  if (expr.type === 'cast') {
    return isBodyPartsRef(expr.operand)
  }
  return false
}

const isAllowedUnnestCall = (call: Expr) => {
  if (call.type !== 'call') return false
  if (normalizeName(call.function.name) !== 'unnest') return false
  if (call.args.length === 0) return true
  if (call.args.length !== 1) return false
  return true
}

const isBodyPartsUnnestCall = (call: Expr) => {
  if (call.type !== 'call') return false
  if (normalizeName(call.function.name) !== 'unnest') return false
  if (call.args.length !== 1) return false
  return isBodyPartsRef(call.args[0])
}

const collectValidationSummary = (statement: SelectStatement, allowlist: CatalogAllowlist) => {
  const tables: TableRef[] = []
  const aliasToTable = new Map<string, string>()
  const cteAliases = new Set<string>()
  const errors: string[] = []
  let isTrendQuery = false
  let allowStar = false
  const selectionAliases = new Set<string>()
  const derivedColumns = new Set<string>()
  const derivedTables = new Set<string>()
  const derivedTablesAllowAll = new Set<string>()
  const allowAllTables = allowlist.tables.size === 0

  const mainSelection = findMainSelection(statement)
  if (mainSelection?.columns) {
    mainSelection.columns.forEach(column => {
      if (column.alias?.name) {
        selectionAliases.add(normalizeName(column.alias.name))
      }
    })
  }
  if (mainSelection?.from) {
    mainSelection.from.forEach(entry => {
      if (entry.type !== 'call' || !isAllowedUnnestCall(entry)) {
        return
      }
      const aliasName = entry.alias?.name ? normalizeName(entry.alias.name) : null
      if (aliasName) {
        derivedTables.add(aliasName)
        if (!entry.alias?.columns?.length) {
          derivedColumns.add(aliasName)
        }
      }
      entry.alias?.columns?.forEach(column => derivedColumns.add(normalizeName(column.name)))
    })
  }

  const visitor = astVisitor(map => ({
    with: st => {
      st.bind.forEach(binding => {
        cteAliases.add(normalizeName(binding.alias.name))
        if (binding.statement.type !== 'select') {
          errors.push('WITH bindings must be SELECT statements.')
        }
      })
      if (st.in.type !== 'select') {
        errors.push('WITH must wrap a SELECT statement.')
      }
      map.super().with(st)
    },
    fromTable: table => {
      const tableName = normalizeName(table.name.name)
      const schema = table.name.schema ? normalizeName(table.name.schema) : null
      if (isSystemSchema(schema)) {
        errors.push(`System schema is not allowed: ${schema}`)
      }
      if (!allowAllTables && !allowlist.tables.has(tableName)) {
        errors.push(`Table is not allowlisted: ${tableName}`)
      }
      const alias = table.name.alias ? normalizeName(table.name.alias) : null
      tables.push({ name: tableName, alias })
      if (alias) aliasToTable.set(alias, tableName)
      map.super().fromTable(table)
    },
    fromStatement: entry => {
      const table = entry as unknown as {
        statement: SelectStatement
        alias?: { name?: string; columns?: Array<{ name: string }> } | string
      }
      if (table.statement.type !== 'select') {
        errors.push('Subqueries in FROM must be SELECT statements.')
        return
      }
      const aliasNameRaw = typeof table.alias === 'string' ? table.alias : table.alias?.name
      const aliasName = aliasNameRaw ? normalizeName(aliasNameRaw) : null
      if (!aliasName) {
        errors.push('Subqueries in FROM must have an alias.')
        return
      }
      derivedTablesAllowAll.add(aliasName)
      derivedTables.add(aliasName)
      if (table.alias && typeof table.alias !== 'string') {
        table.alias.columns?.forEach(column => derivedColumns.add(normalizeName(column.name)))
      }
      const subqueryColumns = (table.statement.columns ?? []) as Array<{
        alias?: { name?: string }
        expr: { type: string; name?: string }
      }>
      subqueryColumns.forEach(column => {
        const alias = column.alias?.name
        if (alias) {
          derivedColumns.add(normalizeName(alias))
          return
        }
        if (column.expr && 'name' in column.expr && typeof column.expr.name === 'string') {
          derivedColumns.add(normalizeName(column.expr.name))
        }
      })
      try {
        collectValidationSummary(table.statement, allowlist)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid subquery in FROM.'
        errors.push(message)
        return
      }
      map.super().fromStatement(entry)
    },
    fromCall: call => {
      if (!isAllowedUnnestCall(call)) {
        errors.push('Set-returning functions in FROM are not allowed.')
        return
      }
      const aliasName = call.alias?.name ? normalizeName(call.alias.name) : null
      if (aliasName) {
        derivedTables.add(aliasName)
        if (!call.alias?.columns?.length) {
          derivedColumns.add(aliasName)
        }
      }
      call.alias?.columns?.forEach(column => derivedColumns.add(normalizeName(column.name)))
      if (isBodyPartsUnnestCall(call)) {
        // Always allow the synthetic body_part column emitted by UNNEST(body_parts)
        derivedColumns.add('body_part')
      }
      map.super().fromCall(call)
    },
    call: call => {
      const funcName = normalizeName(call.function.name)
      const funcSchema = getQNameSchema(call.function)
      if (isSystemSchema(funcSchema)) {
        errors.push(`System schema function is not allowed: ${funcSchema}.${funcName}`)
      }
      if (FORBIDDEN_FUNCTIONS.has(funcName) || funcName.startsWith('pg_')) {
        errors.push(`Function is not allowed: ${funcName}`)
      }
      if (funcName === 'date_trunc') {
        const firstArg = call.args[0]
        if (firstArg && firstArg.type === 'string') {
          const unit = normalizeName(firstArg.value)
          if (unit === 'week' || unit === 'month' || unit === 'year') {
            isTrendQuery = true
          }
        }
      }
      const isCountStar =
        funcName === 'count' &&
        call.args.some(arg => arg.type === 'ref' && arg.name === '*')
      const prevAllowStar = allowStar
      if (isCountStar) allowStar = true
      map.super().call(call)
      allowStar = prevAllowStar
    },
    ref: ref => {
      if (ref.name === '*') {
        if (!allowStar && !allowAllTables) {
          errors.push('SELECT * is not allowed.')
        }
        return
      }
      const column = normalizeName(ref.name)
      if (!ref.table && selectionAliases.has(column)) {
        return
      }
      if (!ref.table && derivedColumns.has(column)) {
        return
      }
      if (ref.table?.schema && isSystemSchema(ref.table.schema)) {
        errors.push(`System schema reference is not allowed: ${ref.table.schema}.${ref.table.name}`)
        return
      }
      if (VIRTUAL_COLUMNS.has(column)) {
        return
      }
      if (allowAllTables) {
        return
      }
      if (ref.table) {
        const tableRefName = normalizeName(ref.table.name)
        if (derivedTablesAllowAll.has(tableRefName)) {
          return
        }
        if (derivedTables.has(tableRefName)) {
          if (derivedColumns.has(column)) return
          errors.push(`Column is not allowlisted: ${tableRefName}.${column}`)
          return
        }
        const tableName = aliasToTable.get(tableRefName) ?? tableRefName
        if (cteAliases.has(tableRefName)) {
          return
        }
        const allowedColumns = allowlist.columns.get(tableName)
        if (!allowedColumns) {
          errors.push(`Column reference uses disallowed table: ${tableRefName}`)
          return
        }
        if (!allowedColumns.has(column)) {
          errors.push(`Column is not allowlisted: ${tableName}.${column}`)
        }
        return
      }
      if (!allowlist.columnUnion.has(column)) {
        errors.push(`Column is not allowlisted: ${column}`)
      }
    },
    constant: constant => {
      if (constant.type === 'string') {
        const literal = normalizeName(constant.value)
        if (!ALLOWED_STRING_LITERALS.has(literal) && !INTERVAL_LITERAL_REGEX.test(constant.value)) {
          errors.push(`String literal must be parameterized: ${constant.value}`)
        }
        return
      }
      if (constant.type === 'constant') {
        const dataType = 'name' in constant.dataType ? normalizeName(constant.dataType.name) : ''
        if (dataType === 'interval' && typeof constant.value === 'string') {
          return
        }
        if (typeof constant.value === 'string') {
          errors.push('String literal must be parameterized.')
        }
      }
    },
  }))

  visitor.statement(statement)

  if (!tables.length) {
    errors.push('At least one allowlisted table is required.')
  }

  if (errors.length) {
    throw new Error(errors[0])
  }

  const hasDateFilter = Boolean(mainSelection && mainSelection.where && exprReferencesDate(mainSelection.where))

  return {
    tables,
    cteAliases,
    hasDateFilter,
    isTrendQuery,
  }
}

const exprReferencesDate = (expr: Expr): boolean => {
  if (expr.type === 'ref') {
    return DATE_COLUMNS.has(normalizeName(expr.name))
  }
  if (expr.type === 'binary') {
    return exprReferencesDate(expr.left) || exprReferencesDate(expr.right)
  }
  if (expr.type === 'unary') {
    return exprReferencesDate(expr.operand)
  }
  if (expr.type === 'call') {
    return expr.args.some(arg => exprReferencesDate(arg))
  }
  if (expr.type === 'cast') {
    return exprReferencesDate(expr.operand)
  }
  if (expr.type === 'case') {
    return (
      (expr.value ? exprReferencesDate(expr.value) : false) ||
      expr.whens.some(when => exprReferencesDate(when.when) || exprReferencesDate(when.value)) ||
      (expr.else ? exprReferencesDate(expr.else) : false)
    )
  }
  if (expr.type === 'list' || expr.type === 'array') {
    return expr.expressions.some(entry => exprReferencesDate(entry))
  }
  if (expr.type === 'ternary') {
    return exprReferencesDate(expr.value) || exprReferencesDate(expr.lo) || exprReferencesDate(expr.hi)
  }
  if (expr.type === 'extract') {
    return exprReferencesDate(expr.from)
  }
  if (expr.type === 'member') {
    return exprReferencesDate(expr.operand)
  }
  if (expr.type === 'arrayIndex') {
    return exprReferencesDate(expr.array) || exprReferencesDate(expr.index)
  }
  if (expr.type === 'overlay') {
    return exprReferencesDate(expr.value) || exprReferencesDate(expr.placing) || exprReferencesDate(expr.from)
  }
  if (expr.type === 'substring') {
    return exprReferencesDate(expr.value) || (expr.from ? exprReferencesDate(expr.from) : false)
  }
  if (expr.type === 'array select') {
    return true
  }
  return false
}

const findMainSelection = (statement: SelectStatement): SelectFromStatement | null => {
  if (statement.type === 'select') return statement
  if (statement.type === 'with') {
    if (statement.in.type === 'select') return statement.in
    return null
  }
  return null
}

const maybeCastDateRef = (expr: Expr): Expr => {
  if (expr.type !== 'ref') return expr
  const name = normalizeName(expr.name)
  if (name === 'date') {
    return { type: 'cast', to: { name: 'date' }, operand: expr }
  }
  if (name === 'timestamp') {
    return { type: 'cast', to: { name: 'timestamptz' }, operand: expr }
  }
  return expr
}

const applyDateRefCasts = (statement: SelectStatement): SelectStatement => {
  const mapper = astMapper(map => ({
    ref: ref => maybeCastDateRef(ref),
    binary: val => {
      const mapped = map.super().binary(val) as ExprBinary
      if (!COMPARISON_OPERATORS.has(mapped.op)) return mapped
      const left = maybeCastDateRef(mapped.left)
      const right = maybeCastDateRef(mapped.right)
      if (left === mapped.left && right === mapped.right) return mapped
      return { ...mapped, left, right }
    },
    ternary: val => {
      const mapped = map.super().ternary(val) as ExprTernary
      if (mapped.op !== 'BETWEEN' && mapped.op !== 'NOT BETWEEN') return mapped
      const value = maybeCastDateRef(mapped.value)
      const lo = maybeCastDateRef(mapped.lo)
      const hi = maybeCastDateRef(mapped.hi)
      if (value === mapped.value && lo === mapped.lo && hi === mapped.hi) return mapped
      return { ...mapped, value, lo, hi }
    },
  }))
  return mapper.statement(statement) as SelectStatement
}

const buildDateFilterExpr = (tableAlias: string | null, window: '90 days' | '12 months'): ExprBinary => {
  const table = tableAlias ? { name: tableAlias } : undefined
  const dateRef: Expr = {
    type: 'cast',
    to: { name: 'date' },
    operand: { type: 'ref', name: 'date', table },
  }
  return {
    type: 'binary',
    op: '>=',
    left: dateRef,
    right: {
      type: 'binary',
      op: '-',
      left: { type: 'keyword', keyword: 'current_date' },
      right: {
        type: 'cast',
        to: { name: 'interval' },
        operand: { type: 'string', value: window },
      },
    },
  }
}

const applyLimit = (selection: SelectFromStatement): { selection: SelectFromStatement; limit: number } => {
  let limitValue = DEFAULT_LIMIT
  if (selection.limit?.limit) {
    const expr = selection.limit.limit
    if (expr.type === 'integer' || expr.type === 'numeric') {
      limitValue = Math.min(expr.value, HARD_LIMIT)
    } else {
      throw new Error('LIMIT must be a constant number.')
    }
  }
  if (limitValue < 1) limitValue = 1

  const limitExpr: ExprInteger = { type: 'integer', value: limitValue }
  const nextLimit = {
    ...(selection.limit ?? {}),
    limit: limitExpr,
  }
  return { selection: { ...selection, limit: nextLimit }, limit: limitValue }
}

const applyTimeWindow = (
  selection: SelectFromStatement,
  summary: ValidationSummary,
  requestedWindow: PolicyHints['timeWindow'],
): { selection: SelectFromStatement; applied: '90 days' | '12 months' | 'all_time' | null } => {
  if (requestedWindow === 'all_time') {
    return { selection, applied: 'all_time' }
  }
  if (summary.hasDateFilter) return { selection, applied: null }
  const primaryTable = summary.tables[0]
  const tableAlias = primaryTable?.alias || primaryTable?.name || null
  const window = summary.isTrendQuery ? '12 months' : '90 days'
  const dateExpr = buildDateFilterExpr(tableAlias, window)
  const nextWhere: Expr = selection.where
    ? ({ type: 'binary', op: 'AND', left: selection.where, right: dateExpr } as ExprBinary)
    : dateExpr
  return { selection: { ...selection, where: nextWhere }, applied: window }
}

const applyPolicyToStatement = (
  statement: SelectStatement,
  summary: ValidationSummary,
  hints: PolicyHints,
): { statement: SelectStatement; limit: number; timeWindow: '90 days' | '12 months' | 'all_time' | null } => {
  ensureNoUnionOrValues(statement)

  if (statement.type === 'select') {
    const withTime = applyTimeWindow(statement, summary, hints.timeWindow)
    const withLimit = applyLimit(withTime.selection)
    return {
      statement: withLimit.selection,
      limit: withLimit.limit,
      timeWindow: withTime.applied,
    }
  }

  if (statement.type === 'with') {
    if (statement.in.type !== 'select') {
      throw new Error('WITH statements must wrap a SELECT query.')
    }
    const applied = applyPolicyToStatement(statement.in, summary, hints)
    return {
      statement: { ...statement, in: applied.statement },
      limit: applied.limit,
      timeWindow: applied.timeWindow,
    }
  }

  throw new Error('Unsupported SQL statement.')
}

const ensureParamsMatchPlaceholders = (sql: string, params: unknown[]) => {
  const placeholders = Array.from(sql.matchAll(/\$([1-9]\d*)/g)).map(match => Number(match[1]))
  if (!placeholders.length && params.length) {
    throw new Error('Parameters provided but SQL has no placeholders.')
  }
  const maxIndex = placeholders.length ? Math.max(...placeholders) : 0
  const distinct = new Set(placeholders)
  if (maxIndex !== params.length || distinct.size > params.length) {
    throw new Error('Placeholder count does not match params length.')
  }
  for (let i = 1; i <= maxIndex; i += 1) {
    if (!distinct.has(i)) {
      throw new Error('SQL placeholders must be sequential.')
    }
  }
}

export const validateAndRewriteSql = (rawSql: string, params: unknown[]): SqlPolicyResult => {
  if (!rawSql.trim()) {
    throw new Error('SQL is empty.')
  }
  const normalizedSql = rawSql
    .replace(/\binterval\s+\$(\d+)/gi, (_match, index) => `($${index})::interval`)
    .replace(/current_date\s*-\s*\$(\d+)/gi, (_match, index) => `current_date - ($${index})::interval`)
  const { sql: hintFreeSql, hints } = stripPolicyHints(normalizedSql)
  ensureAllowedKeywordUsage(hintFreeSql)

  const statements = parse(hintFreeSql)
  if (statements.length !== 1) {
    throw new Error('Only a single SQL statement is allowed.')
  }

  const selectStatement = ensureSingleSelect(statements[0])
  const coercedStatement = applyDateRefCasts(selectStatement)
  const allowlist = getCatalogAllowlist()
  const summary = collectValidationSummary(coercedStatement, allowlist)
  ensureParamsMatchPlaceholders(hintFreeSql, params)

  const { statement, limit, timeWindow } = applyPolicyToStatement(coercedStatement, summary, hints)
  const sql = toSql.statement(statement)

  return {
    sql,
    params,
    appliedLimit: limit,
    appliedTimeWindow: timeWindow,
  }
}
