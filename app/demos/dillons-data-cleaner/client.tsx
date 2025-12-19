'use client'

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import * as XLSX from 'xlsx'

// ---------- Types ----------

type CellValue = string | number | boolean | Date | null | undefined

type HeaderCase = 'none' | 'upper' | 'lower'
type HeaderWhitespace = 'trim-edges' | 'remove-all' | 'replace'

type NullPattern = {
  id: string
  label: string
  helper?: string
  enabled: boolean
  type: 'builtin' | 'custom'
  value?: string
}

type NullState = {
  enabled: boolean
  patterns: NullPattern[]
  replacement: string
  leaveEmpty: boolean
}

type HeaderState = {
  enabled: boolean
  letterCase: HeaderCase
  whitespace: HeaderWhitespace
  replacement: string
  collapseWhitespace: boolean
  scope: 'all' | 'some'
  sheets: string[]
}

type HeaderOverrides = Record<string, Record<number, string>>

type ColumnSortMode = 'asc' | 'desc' | 'reset' | null

type ColumnOrderState = {
  enabled: boolean
  orders: Record<string, number[]>
  sortModeBySheet: Record<string, ColumnSortMode>
}

type FindReplaceMatchMode = 'equals' | 'contains' | 'regex'

type FindReplaceRule = {
  id: string
  scope: 'sheet' | 'columns' | 'workbook'
  columns: number[]
  matchMode: FindReplaceMatchMode
  caseSensitive: boolean
  find: string
  replace: string
  enabled: boolean
  regexError?: string | null
}

type FindReplaceState = {
  enabled: boolean
  rulesBySheet: Record<string, FindReplaceRule[]>
}

type DateGuardReason = 'id-like' | 'low-confidence'

type DateColumnConfig = {
  enabled: boolean
  format: string
  confidence: number
  sampleCount: number
  guardReason: DateGuardReason | null
}

type DateMode = 'global' | 'per-column'

type DateState = {
  enabled: boolean
  mode: DateMode
  defaultFormat: string
  columns: Record<string, Record<number, DateColumnConfig>>
}

type CalculatedOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'concat'

type CalculatedRule = {
  id: string
  label: string
  type: CalculatedOperation
  sources: number[]
  delimiter: string
  enabled: boolean
}

type CalculatedState = {
  enabled: boolean
  rulesBySheet: Record<string, CalculatedRule[]>
}

type TextCaseMode = 'lower' | 'upper' | 'proper' | 'preserve'
type TextNormalizeMode = 'global' | 'per-column' | 'global-with-overrides'

type TextNormalizeColumnConfig = {
  enabled: boolean
  caseMode: TextCaseMode
  trimEdges: boolean
  collapseSpaces: boolean
}

type TextNormalizeState = {
  enabled: boolean
  mode: TextNormalizeMode
  defaultCaseMode: TextCaseMode
  defaultTrimEdges: boolean
  defaultCollapseSpaces: boolean
  columns: Record<string, Record<number, TextNormalizeColumnConfig>>
}

type NumericPrecision = 'auto' | 0 | 1 | 2 | 3 | 4
type NumericFormatMode = 'plain' | 'currency' | 'percent'

type NumericKind = 'currency' | 'percent' | 'integer' | 'float' | 'mixed' | 'unknown'

const NUMERIC_KIND_VALUES: NumericKind[] = ['currency', 'percent', 'integer', 'float', 'mixed', 'unknown']

function isNumericKind(value: string): value is NumericKind {
  return NUMERIC_KIND_VALUES.includes(value as NumericKind)
}

type NumericDetection = {
  isNumeric: boolean
  kind: NumericKind
  precision: number | null
}

type NumericColumnConfig = {
  enabled: boolean
  stripSymbols: boolean
  precision: NumericPrecision
  format: NumericFormatMode
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY'
}

type NumericCleanupState = {
  enabled: boolean
  columns: Record<string, Record<number, NumericColumnConfig>>
}

type DedupKeepStrategy = 'first' | 'last'
type DedupNumericStrategy = 'keep' | 'sum'
type DedupTextStrategy = 'keep' | 'concat'

type DedupConfig = {
  keyColumns: number[]
  keepStrategy: DedupKeepStrategy
  numericStrategy: DedupNumericStrategy
  textStrategy: DedupTextStrategy
}

type DedupState = {
  enabled: boolean
  configsBySheet: Record<string, DedupConfig>
}

type LookupJoinPair = {
  id: string
  sourceColumn: number | null
  referenceColumn: number | null
}

type LookupDuplicateStrategy = 'first' | 'last' | 'abort'

type LookupDiagnostics = {
  matchedRows: number
  unmatchedRows: number
  duplicateKeys: number
  aborted: boolean
  strategy: LookupDuplicateStrategy
}

type LookupConfig = {
  referenceSheet: string | null
  prefix: string
  joins: LookupJoinPair[]
  importColumns: number[]
  duplicateStrategy: LookupDuplicateStrategy
}

type LookupState = {
  enabled: boolean
  configsBySheet: Record<string, LookupConfig>
}

type SheetPreview = {
  name: string
  rows: CellValue[][]
  headerChanges: number
  columnOrderChanges: number
  dateChanges: number
  calculatedChanges: number
  nullChanges: number
  findChanges: number
  textNormalizeChanges: number
  numericChanges: number
  dedupeRemovals: number
  lookupAdds: number
  totalRows: number
  highlightMask?: boolean[][]
  highlightNotice?: string | null
  numericWarnings: {
    percentOverflow: Record<number, number>
  }
  lookupDiagnostics?: LookupDiagnostics
}

type FileInfo = {
  name: string
  size: number
  type: string
  isXlsx: boolean
}

type WorkflowStepId =
  | 'headers'
  | 'column-order'
  | 'dates'
  | 'text-normalize'
  | 'numeric'
  | 'nulls'
  | 'find-replace'
  | 'calculated'
  | 'dedupe'
  | 'lookup'
  | 'run-download'

type WorkflowStepMeta = {
  id: WorkflowStepId
  label: string
  description: string
}

// ---------- Constants ----------

const PREVIEW_ROW_LIMIT = 5
const FILE_INPUT_ID = 'dillons-data-cleaner-file'
const DEFAULT_DATE_FORMAT = 'MM-dd-yyyy'
const ACCEPTED_TYPES = [
  '.csv',
  '.xls',
  '.xlsx',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const BUILTIN_PATTERNS: NullPattern[] = [
  { id: 'empty', label: 'Empty / whitespace cells', helper: '"", space, tab', enabled: true, type: 'builtin' },
  { id: 'null', label: '"NULL" / "null"', helper: 'Case insensitive', enabled: true, type: 'builtin' },
  { id: 'na', label: '"N/A" / "NA"', helper: 'Case insensitive', enabled: true, type: 'builtin' },
  { id: 'nan', label: '"NaN"', helper: 'Case insensitive', enabled: true, type: 'builtin' },
  { id: 'dash', label: 'Single or double dash', helper: '-', enabled: true, type: 'builtin' },
  { id: 'none', label: '"None"', helper: 'Case insensitive', enabled: false, type: 'builtin' },
]

const HEADER_CASE_LABELS: Record<HeaderCase, string> = {
  none: 'Keep current casing',
  upper: 'UPPER CASE',
  lower: 'lower case',
}

const HEADER_WHITESPACE_LABELS: Record<HeaderWhitespace, string> = {
  'trim-edges': 'Trim outside whitespace only',
  'remove-all': 'Remove every space',
  replace: 'Replace spaces with custom token',
}

const DATE_FORMAT_OPTIONS = [
  'MM-dd-yyyy',
  'MM/dd/yyyy',
  'dd-MM-yyyy',
  'dd/MM/yyyy',
  'yyyy-MM-dd',
  'yyyy/MM/dd',
  'yyyyMMdd',
  'MMM dd, yyyy',
  'MMMM dd, yyyy',
  'dd MMM yyyy',
  'dd MMMM yyyy',
  'MM-dd-yy',
  'MM/dd/yy',
  'dd-MM-yy',
  'dd/MM/yy',
  'yyyy-MM-dd HH:mm',
  'yyyy-MM-dd HH:mm:ss',
  'MM/dd/yyyy HH:mm',
  'MM/dd/yyyy HH:mm:ss',
  'dd/MM/yyyy HH:mm',
  'dd/MM/yyyy HH:mm:ss',
  'MM-dd-yyyy HH:mm',
  'MM-dd-yyyy HH:mm:ss',
  'yyyy/MM/dd HH:mm',
  'yyyy/MM/dd HH:mm:ss',
  'yyyyMMddHHmmss',
  'yyyy-MM-ddTHH:mm',
  'yyyy-MM-ddTHH:mm:ss',
  'MM/dd/yyyy hh:mm a',
  'MM/dd/yyyy hh:mm:ss a',
  'MMM dd, yyyy hh:mm a',
  'MMMM dd, yyyy hh:mm a',
  'yyyy-MM-dd hh:mm a',
]

const KNOWN_DATE_FORMATS = [
  'MM/dd/yyyy',
  'dd/MM/yyyy',
  'MM-dd-yyyy',
  'dd-MM-yyyy',
  'yyyy-MM-dd',
  'yyyy/MM/dd',
  'yyyyMMdd',
  'MMM dd, yyyy',
  'MMMM dd, yyyy',
  'dd MMM yyyy',
  'dd MMMM yyyy',
  'MM/dd/yy',
  'dd/MM/yy',
  'MM-dd-yy',
  'dd-MM-yy',
  'yyyy-MM-dd HH:mm',
  'yyyy-MM-dd HH:mm:ss',
  'MM/dd/yyyy HH:mm',
  'MM/dd/yyyy HH:mm:ss',
  'dd/MM/yyyy HH:mm',
  'dd/MM/yyyy HH:mm:ss',
  'MM-dd-yyyy HH:mm',
  'MM-dd-yyyy HH:mm:ss',
  'yyyy/MM/dd HH:mm',
  'yyyy/MM/dd HH:mm:ss',
  'yyyyMMddHHmmss',
  'yyyy-MM-ddTHH:mm',
  'yyyy-MM-ddTHH:mm:ss',
  'MM/dd/yyyy hh:mm a',
  'MM/dd/yyyy hh:mm:ss a',
  'MMM dd, yyyy hh:mm a',
  'MMMM dd, yyyy hh:mm a',
  'yyyy-MM-dd hh:mm a',
]

const DATE_CONFIDENCE_THRESHOLD = 0.7

const CALCULATED_OPERATIONS: { value: CalculatedOperation; label: string }[] = [
  { value: 'add', label: 'Add values' },
  { value: 'subtract', label: 'Subtract values' },
  { value: 'multiply', label: 'Multiply values' },
  { value: 'divide', label: 'Divide values' },
  { value: 'concat', label: 'Concatenate values' },
]

const SHEET_PLACEHOLDER = 'Upload a CSV or XLSX to preview the first few rows.'

const TEXT_CASE_LABELS: Record<TextCaseMode, string> = {
  lower: 'lowercase',
  upper: 'UPPERCASE',
  proper: 'Proper Case',
  preserve: 'Keep as-is',
}

const NUMERIC_PRECISION_OPTIONS: NumericPrecision[] = ['auto', 0, 1, 2, 3, 4]

const NUMERIC_FORMAT_OPTIONS: { value: NumericFormatMode; label: string }[] = [
  { value: 'plain', label: 'Plain number' },
  { value: 'currency', label: 'Currency' },
  { value: 'percent', label: 'Percent' },
]

const CURRENCY_OPTIONS: { value: NumericColumnConfig['currency']; label: string }[] = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
]

const CURRENCY_SYMBOLS: Record<NumericColumnConfig['currency'], string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
}

const WORKFLOW_STEPS: WorkflowStepMeta[] = [
  {
    id: 'headers',
    label: 'Column Headers',
    description: 'Trim whitespace and recase headers before anything else touches the data.',
  },
  {
    id: 'column-order',
    label: 'Column Order',
    description: 'Drag to reorder or apply alphabetized sequences across sheets.',
  },
  {
    id: 'dates',
    label: 'Dates',
    description: 'Detect and format date-looking cells globally or column by column.',
  },
  {
    id: 'text-normalize',
    label: 'Case & Whitespace',
    description: 'Normalize casing, trim edges, and collapse internal whitespace.',
  },
  {
    id: 'numeric',
    label: 'Numeric Cleanup',
    description: 'Strip stray characters, enforce precision, and output currency or percent formatting.',
  },
  {
    id: 'nulls',
    label: 'Null Values',
    description: 'Collapse blank tokens and custom placeholders into a consistent output.',
  },
  {
    id: 'find-replace',
    label: 'Find & Replace',
    description: 'Chain substring, equals, or regex replacements per sheet.',
  },
  {
    id: 'calculated',
    label: 'Calculated Fields',
    description: 'Derive new columns by combining or math-ing across existing ones.',
  },
  {
    id: 'dedupe',
    label: 'Deduplication & Merge',
    description: 'Pick key columns and choose merge behavior when duplicates appear.',
  },
  {
    id: 'lookup',
    label: 'Lookup / Enrichment',
    description: 'Join another sheet in the workbook to enrich the active one.',
  },
  {
    id: 'run-download',
    label: 'Run & Download',
    description: 'Review the sequence and export the cleaned file.',
  },
]

const ADVANCED_STEP_IDS: WorkflowStepId[] = ['calculated', 'dedupe', 'lookup']
const WORKFLOW_STEP_ORDER: WorkflowStepId[] = WORKFLOW_STEPS.map(step => step.id)
const FIRST_STEP: WorkflowStepId = WORKFLOW_STEP_ORDER[0]

// ---------- Utility helpers ----------

function createDefaultNullState(): NullState {
  return {
    enabled: false,
    replacement: 'NULL',
    leaveEmpty: false,
    patterns: BUILTIN_PATTERNS.map(pattern => ({ ...pattern })),
  }
}

function createDefaultHeaderState(): HeaderState {
  return {
    enabled: false,
    letterCase: 'none',
    whitespace: 'trim-edges',
    replacement: '_',
    collapseWhitespace: false,
    scope: 'all',
    sheets: [],
  }
}

function createDefaultTextNormalizeState(): TextNormalizeState {
  return {
    enabled: false,
    mode: 'global',
    defaultCaseMode: 'lower',
    defaultTrimEdges: true,
    defaultCollapseSpaces: true,
    columns: {},
  }
}

function createDefaultNumericCleanupState(): NumericCleanupState {
  return {
    enabled: false,
    columns: {},
  }
}

function createDefaultDedupState(): DedupState {
  return {
    enabled: false,
    configsBySheet: {},
  }
}

function createDefaultLookupState(): LookupState {
  return {
    enabled: false,
    configsBySheet: {},
  }
}

function normalizeRows(rows: CellValue[][]): CellValue[][] {
  if (!rows.length) return [[]]
  const width = Math.max(1, ...rows.map(row => row.length))
  return rows.map(row => Array.from({ length: width }, (_, idx) => row[idx] ?? ''))
}

function cloneRows(rows: CellValue[][]): CellValue[][] {
  return rows.map(row => [...row])
}

function formatSheetName(name: string, index: number) {
  const fallback = `Sheet${index + 1}`
  const trimmed = name?.trim().length ? name.trim() : fallback
  return trimmed.slice(0, 31)
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`
}

function matchesPattern(value: CellValue, pattern: NullPattern) {
  const text = value == null ? '' : String(value)
  if (pattern.type === 'custom' && pattern.value) {
    return text.trim().toLowerCase() === pattern.value.trim().toLowerCase()
  }
  const trimmed = text.trim()
  switch (pattern.id) {
    case 'empty':
      return trimmed.length === 0
    case 'null':
      return /^null$/i.test(trimmed)
    case 'na':
      return /^(n\/a|na)$/i.test(trimmed)
    case 'nan':
      return /^nan$/i.test(trimmed)
    case 'dash':
      return trimmed === '-' || trimmed === '--'
    case 'none':
      return /^none$/i.test(trimmed)
    default:
      return false
  }
}

function renderCell(cell: CellValue) {
  if (cell === null || cell === undefined) return ''
  if (cell instanceof Date) return cell.toISOString()
  return typeof cell === 'string' ? cell : String(cell)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function ensureXlsxFilename(filename: string) {
  // Exporter always writes XLSX binaries; force the matching extension to avoid Excel warnings.
  if (/\.xlsx$/i.test(filename)) return filename
  if (/\.[^.]+$/i.test(filename)) {
    return filename.replace(/\.[^.]+$/i, '.xlsx')
  }
  return `${filename}.xlsx`
}

function applyHeaderFormatting(value: CellValue, headerState: HeaderState) {
  let text = value == null ? '' : String(value)

  switch (headerState.whitespace) {
    case 'remove-all':
      text = text.replace(/\s+/g, '')
      break
    case 'replace':
      text = text.trim()
      if (headerState.collapseWhitespace) {
        text = text.replace(/\s+/g, ' ')
      }
      text = text.replace(/\s+/g, headerState.replacement || '_')
      break
    case 'trim-edges':
    default:
      text = text.trim()
      if (headerState.collapseWhitespace) {
        text = text.replace(/\s+/g, ' ')
      }
      break
  }

  switch (headerState.letterCase) {
    case 'upper':
      return text.toUpperCase()
    case 'lower':
      return text.toLowerCase()
    case 'none':
    default:
      return text
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getFindReplaceRegexError(rule: FindReplaceRule) {
  if (rule.matchMode !== 'regex') return null
  if (!rule.find.length) return null
  try {
    new RegExp(rule.find, rule.caseSensitive ? 'g' : 'gi')
    return null
  } catch (error) {
    return 'Invalid regular expression'
  }
}

function applyFindReplaceRules(
  value: CellValue,
  columnIndex: number,
  rules: FindReplaceRule[],
): { next: string; changes: number } {
  let text = value == null ? '' : String(value)
  let changes = 0

  rules.forEach(rule => {
    if (!rule.enabled) return
    if (!rule.find.length || !rule.replace.length) return
    if (rule.regexError) return

    if (rule.scope === 'columns' && !rule.columns.includes(columnIndex)) return

    if (rule.matchMode === 'equals') {
      const current = rule.caseSensitive ? text : text.toLowerCase()
      const target = rule.caseSensitive ? rule.find : rule.find.toLowerCase()
      if (current === target) {
        text = rule.replace
        changes += 1
      }
      return
    }

    if (rule.matchMode === 'contains') {
      if (rule.caseSensitive) {
        if (text.includes(rule.find)) {
          const regex = new RegExp(escapeRegExp(rule.find), 'g')
          text = text.replace(regex, rule.replace)
          changes += 1
        }
      } else {
        const regex = new RegExp(escapeRegExp(rule.find), 'gi')
        if (regex.test(text)) {
          text = text.replace(regex, rule.replace)
          changes += 1
        }
      }
      return
    }

    if (rule.matchMode === 'regex') {
      try {
        const flags = rule.caseSensitive ? 'g' : 'gi'
        const regex = new RegExp(rule.find, flags)
        if (regex.test(text)) {
          text = text.replace(regex, rule.replace)
          changes += 1
        }
      } catch (error) {
        // ignore invalid regex
      }
    }
  })

  return { next: text, changes }
}

function getFindReplaceRulesForSheet(
  sheetName: string,
  rulesBySheet: Record<string, FindReplaceRule[]>,
) {
  const seen = new Set<string>()
  const combined: FindReplaceRule[] = []
  const addRule = (rule: FindReplaceRule) => {
    if (seen.has(rule.id)) return
    seen.add(rule.id)
    combined.push(rule)
  }
  ;(rulesBySheet[sheetName] ?? []).forEach(addRule)
  Object.values(rulesBySheet).forEach(rules => {
    rules.forEach(rule => {
      if (rule.scope === 'workbook') addRule(rule)
    })
  })
  return combined
}

function formatDateValue(date: Date, format: string) {
  const pad = (value: number, length = 2) => value.toString().padStart(length, '0')
  const shortMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const longMonthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const hours24 = date.getHours()
  const hours12 = hours24 % 12 || 12
  const replacements: Record<string, string> = {
    yyyy: pad(date.getFullYear(), 4),
    MMMM: longMonthNames[date.getMonth()],
    MMM: shortMonthNames[date.getMonth()],
    MM: pad(date.getMonth() + 1),
    dd: pad(date.getDate()),
    HH: pad(date.getHours()),
    hh: pad(hours12),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
    a: hours24 >= 12 ? 'PM' : 'AM',
  }
  return format.replace(/yyyy|MMMM|MMM|MM|dd|HH|hh|mm|ss|a/g, token => replacements[token] ?? token)
}

function parseDateWithFormat(value: string, format: string) {
  const tokens = ['yyyy', 'MMMM', 'MMM', 'MM', 'dd', 'HH', 'hh', 'mm', 'ss', 'a']
  const tokenPatterns: Record<string, string> = {
    yyyy: '(?<year>\\d{4})',
    MMMM: '(?<monthName>[A-Za-z]{3,9})',
    MMM: '(?<monthName>[A-Za-z]{3})',
    MM: '(?<month>\\d{1,2})',
    dd: '(?<day>\\d{1,2})',
    HH: '(?<hour>\\d{1,2})',
    hh: '(?<hour12>\\d{1,2})',
    mm: '(?<minute>\\d{1,2})',
    ss: '(?<second>\\d{1,2})',
    a: '(?<ampm>AM|PM|am|pm)',
  }
  let pattern = format
  tokens.forEach(token => {
    pattern = pattern.split(token).join(`__${token}__`)
  })
  pattern = escapeRegExp(pattern)
  tokens.forEach(token => {
    pattern = pattern.split(`__${token}__`).join(tokenPatterns[token])
  })
  const regex = new RegExp(`^${pattern}$`)
  const match = value.match(regex)
  if (!match || !match.groups) return null

  const year = Number(match.groups.year ?? '0')
  const day = Number(match.groups.day ?? '1')
  const minute = Number(match.groups.minute ?? '0')
  const second = Number(match.groups.second ?? '0')
  let hour = Number(match.groups.hour ?? match.groups.hour12 ?? '0')
  const ampm = match.groups.ampm?.toLowerCase()
  if (ampm === 'pm' && hour < 12) hour += 12
  if (ampm === 'am' && hour === 12) hour = 0

  const monthName = match.groups.monthName
  let month = Number(match.groups.month ?? '1') - 1
  if (monthName) {
    const lookup = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const key = monthName.slice(0, 3).toLowerCase()
    const index = lookup.indexOf(key)
    if (index >= 0) month = index
  }

  const parsed = new Date(year, month, day, hour, minute, second)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseDateValue(value: CellValue) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 59 && value < 50000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30))
      return new Date(excelEpoch.getTime() + value * 86400000)
    }
  }

  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text.length) return null

  const direct = new Date(text)
  if (!Number.isNaN(direct.getTime())) return direct

  for (const format of KNOWN_DATE_FORMATS) {
    const parsed = parseDateWithFormat(text, format)
    if (parsed) return parsed
  }

  return null
}

function analyzeDateColumns(rows: CellValue[][]) {
  const analysis: Record<
    number,
    { confidence: number; sampleCount: number; guardReason: DateGuardReason | null; enabled: boolean }
  > = {}
  if (!rows.length) return analysis
  const body = rows.slice(1)
  const maxSamples = 50

  rows[0].forEach((_, columnIndex) => {
    let samples = 0
    let parseHits = 0
    for (let i = 0; i < body.length; i += 1) {
      const candidate = body[i]?.[columnIndex]
      if (candidate === null || candidate === undefined || candidate === '') continue
      samples += 1
      if (parseDateValue(candidate)) parseHits += 1
      if (samples >= maxSamples) break
    }
    const confidence = samples > 0 ? parseHits / samples : 0
    const guardReason: DateGuardReason | null = null
    const enabled = confidence >= DATE_CONFIDENCE_THRESHOLD

    analysis[columnIndex] = {
      confidence,
      sampleCount: samples,
      guardReason,
      enabled,
    }
  })

  return analysis
}

function getDefaultOrder(length: number) {
  return Array.from({ length }, (_, idx) => idx)
}

function normalizeColumnOrder(order: number[] | undefined, width: number) {
  const base = getDefaultOrder(width)
  if (!order || !order.length) return base
  const seen = new Set<number>()
  const normalized: number[] = []
  order.forEach(index => {
    if (index < 0 || index >= width || seen.has(index)) return
    seen.add(index)
    normalized.push(index)
  })
  base.forEach(index => {
    if (!seen.has(index)) normalized.push(index)
  })
  return normalized
}

function applyColumnOrder(rows: CellValue[][], state: ColumnOrderState, sheet: string) {
  const width = rows[0]?.length ?? 0
  const sourceOrder = state.enabled ? state.orders[sheet] : undefined
  const order = normalizeColumnOrder(sourceOrder, width)
  if (!state.enabled) {
    return { rows: rows.map(row => [...row]), order }
  }
  const orderedRows = rows.map(row => order.map(idx => row[idx] ?? ''))
  return { rows: orderedRows, order }
}

function computeCalculatedValue(type: CalculatedOperation, values: string[], delimiter: string) {
  const toNumber = (value: string) => {
    const parsed = parseNumericToken(value)
    if (!parsed) return NaN
    let num = parsed.value
    if (parsed.hasPercent) {
      num = num / 100
    }
    return Number.isFinite(num) ? num : NaN
  }
  if (type === 'concat') {
    const sanitizedValues = values.map(value => value.trim())
    const activeValues = sanitizedValues.filter(value => value.length)
    return activeValues.join(delimiter ?? '')
  }
  const numbers = values.map(toNumber)
  if (numbers.some(value => Number.isNaN(value))) return ''
  switch (type) {
    case 'add':
      return numbers.reduce((acc, value) => acc + value, 0).toString()
    case 'subtract':
      return numbers.slice(1).reduce((acc, value) => acc - value, numbers[0]).toString()
    case 'multiply':
      return numbers.reduce((acc, value) => acc * value, 1).toString()
    case 'divide':
      return numbers.slice(1).reduce((acc, value) => (value === 0 ? NaN : acc / value), numbers[0]).toString()
    default:
      return ''
  }
}

function getCalculatedRuleErrors(
  rule: CalculatedRule,
  columnCount: number,
  numericDetection: Record<number, NumericDetection>,
  revealIncompleteErrors: boolean,
): { inline: string | null; blocking: string | null } {
  if (!rule.enabled) {
    return { inline: null, blocking: null }
  }
  const uniqueSources = Array.from(
    new Set(rule.sources.filter(index => index != null && index >= 0 && index < columnCount)),
  )
  if (uniqueSources.length < 2) {
    const message = 'Select at least two valid source columns.'
    return {
      blocking: message,
      inline: revealIncompleteErrors ? message : null,
    }
  }
  if (rule.type === 'concat') {
    return { inline: null, blocking: null }
  }
  const hasNumericMismatch = uniqueSources.some(index => !numericDetection[index]?.isNumeric)
  if (hasNumericMismatch) {
    const message = 'Math operations require numeric-only sources.'
    return { blocking: message, inline: message }
  }
  return { inline: null, blocking: null }
}

function toProperCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map(word => (word.length ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ')
}

function normalizeTextCell(
  value: CellValue,
  options: { caseMode: TextCaseMode; trimEdges: boolean; collapseSpaces: boolean },
): { next: CellValue; changed: boolean } {
  if (typeof value !== 'string') {
    return { next: value, changed: false }
  }
  let next = value
  if (options.trimEdges) next = next.trim()
  if (options.collapseSpaces) next = next.replace(/\s+/g, ' ')
  switch (options.caseMode) {
    case 'upper':
      next = next.toUpperCase()
      break
    case 'lower':
      next = next.toLowerCase()
      break
    case 'proper':
      next = toProperCase(next)
      break
    case 'preserve':
    default:
      break
  }
  return { next, changed: next !== value }
}

function parseNumericToken(
  value: CellValue,
): { value: number; kind: NumericKind; precision: number; hasPercent: boolean; hasCurrency: boolean } | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    const text = value.toString()
    const precision = text.includes('.') ? text.split('.')[1]?.length ?? 0 : 0
    return {
      value,
      kind: Number.isInteger(value) ? 'integer' : 'float',
      precision,
      hasPercent: false,
      hasCurrency: false,
    }
  }
  if (typeof value !== 'string') return null
  let text = value.trim()
  if (!text.length) return null

  const hasCurrency = /[$€£¥]/.test(text)
  const hasPercent = text.includes('%')
  const isNegativeParens = /^\(.*\)$/.test(text)
  if (isNegativeParens) {
    text = text.slice(1, -1)
  }

  text = text.replace(/[$€£¥]/g, '')
  text = text.replace(/,/g, '')
  text = text.replace(/%/g, '')
  text = text.replace(/\s+/g, '')
  if (!text.length) return null
  if (!/^[-+]?\d*\.?\d+$/.test(text)) return null

  let parsed = Number(text)
  if (!Number.isFinite(parsed)) return null
  if (isNegativeParens) parsed *= -1

  const precision = text.includes('.') ? text.split('.')[1]?.length ?? 0 : 0
  let kind: NumericKind = precision > 0 ? 'float' : 'integer'
  if (hasPercent) kind = 'percent'
  if (hasCurrency) kind = 'currency'

  return {
    value: parsed,
    kind,
    precision,
    hasPercent,
    hasCurrency,
  }
}

function isNumericLike(value: CellValue) {
  return Boolean(parseNumericToken(value))
}

function detectNumericColumns(rows: CellValue[][]) {
  const detection: Record<number, NumericDetection> = {}
  if (!rows.length) return detection
  const body = rows.slice(1)
  const maxSamples = 25
  rows[0].forEach((_, columnIndex) => {
    let samples = 0
    let hits = 0
    const kindCounts: Record<string, number> = {
      currency: 0,
      percent: 0,
      integer: 0,
      float: 0,
      mixed: 0,
      unknown: 0,
    }
    const precisionCounts: Record<number, number> = {}
    for (let i = 0; i < body.length; i += 1) {
      const candidate = body[i]?.[columnIndex]
      if (candidate === null || candidate === undefined || candidate === '') continue
      samples += 1
      const parsed = parseNumericToken(candidate)
      if (parsed) {
        hits += 1
        const kind = isNumericKind(parsed.kind) ? parsed.kind : 'unknown'
        kindCounts[kind] = (kindCounts[kind] ?? 0) + 1
        if (parsed.precision != null) {
          precisionCounts[parsed.precision] = (precisionCounts[parsed.precision] ?? 0) + 1
        }
      }
      if (samples >= maxSamples) break
    }
    const isNumeric = samples > 0 && hits / samples >= 0.7
    let kind: NumericKind = 'unknown'
    if (isNumeric) {
      const ranked = Object.entries(kindCounts)
        .filter(([key]) => key !== 'mixed' && key !== 'unknown')
        .sort((a, b) => b[1] - a[1])
      const top = ranked[0]
      if (top && top[1] >= hits * 0.6) {
        kind = top[0] as NumericKind
      } else if (ranked.some(([, count]) => count > 0)) {
        kind = 'mixed'
      }
    }
    let precision: number | null = null
    if (kind === 'float') {
      const precisions = Object.entries(precisionCounts).sort((a, b) => b[1] - a[1])
      precision = precisions.length ? Number(precisions[0][0]) : null
    } else if (kind === 'integer') {
      precision = 0
    }
    detection[columnIndex] = { isNumeric, kind, precision }
  })
  return detection
}

function buildNumericConfigFromDetection(
  detection?: NumericDetection,
  enabled = false,
): NumericColumnConfig {
  let format: NumericFormatMode = 'plain'
  let precision: NumericPrecision = 'auto'
  if (detection?.kind === 'currency') {
    format = 'currency'
  } else if (detection?.kind === 'percent') {
    format = 'percent'
  } else if (detection?.kind === 'integer') {
    precision = 0
  } else if (detection?.kind === 'float' && detection.precision != null) {
    const capped = Math.min(4, Math.max(0, detection.precision))
    precision = capped as NumericPrecision
  }
  return {
    enabled,
    stripSymbols: true,
    precision,
    format,
    currency: 'USD',
  }
}

type NumericWarning = 'percent-overflow'

function interpretPercentValue(parsed: number, originalHasPercent: boolean) {
  if (!Number.isFinite(parsed)) {
    return { overflow: false, value: null }
  }
  if (originalHasPercent) {
    return { overflow: Math.abs(parsed) > 100, value: parsed }
  }
  if (Math.abs(parsed) > 100) {
    return { overflow: true, value: null }
  }
  if (Math.abs(parsed) <= 1) {
    return { overflow: false, value: parsed * 100 }
  }
  return { overflow: false, value: parsed }
}

function cleanNumericCell(
  value: CellValue,
  config: NumericColumnConfig,
): { next: CellValue; changed: boolean; warning?: NumericWarning } {
  const raw = value == null ? '' : String(value)
  if (!raw.length) return { next: value ?? '', changed: false }
  if (!config.stripSymbols && /[$€£¥\s]/.test(raw)) {
    return { next: value ?? '', changed: false }
  }
  const parsedToken = parseNumericToken(raw)
  if (!parsedToken) return { next: value ?? '', changed: false }
  const parsed = parsedToken.value
  const formatNumber = (num: number) => (config.precision === 'auto' ? num.toString() : num.toFixed(config.precision))
  if (config.format === 'percent') {
    const { overflow, value: percentValue } = interpretPercentValue(parsed, parsedToken.hasPercent)
    if (overflow || percentValue == null) {
      return { next: value ?? '', changed: false, warning: 'percent-overflow' }
    }
    const formatted = `${formatNumber(percentValue)}%`
    return { next: formatted, changed: formatted !== raw }
  }
  const baseValue = formatNumber(parsed)
  if (config.format === 'currency') {
    const symbol = CURRENCY_SYMBOLS[config.currency] ?? ''
    const formatted = `${symbol}${baseValue}`
    return { next: formatted, changed: formatted !== raw }
  }
  return { next: baseValue, changed: baseValue !== raw }
}

function buildJoinKey(values: CellValue[]) {
  return values.map(value => (value == null ? '' : String(value).trim().toLowerCase())).join('||')
}

function hasLookupJoinColumns(
  pair: LookupJoinPair,
): pair is LookupJoinPair & { sourceColumn: number; referenceColumn: number } {
  return pair.sourceColumn != null && pair.referenceColumn != null
}

function collectSampleValues(rows: CellValue[][], columnIndex: number, limit = 3) {
  const samples: string[] = []
  if (!rows.length) return samples
  for (let i = 1; i < rows.length; i += 1) {
    const value = rows[i][columnIndex]
    if (value === '' || value === null || value === undefined) continue
    samples.push(String(value))
    if (samples.length >= limit) break
  }
  return samples
}

// ---------- Transform ----------

type TransformOptions = {
  sheetName: string
  rows: CellValue[][]
  columnNames: string[]
  allRowsBySheet: Record<string, CellValue[][]>
  allColumnNames: Record<string, string[]>
  headerState: HeaderState
  headerOverrides: HeaderOverrides
  columnOrderState: ColumnOrderState
  dateState: DateState
  textNormalizeState: TextNormalizeState
  numericCleanupState: NumericCleanupState
  calculatedState: CalculatedState
  nullState: NullState
  findReplaceState: FindReplaceState
  dedupState: DedupState
  lookupState: LookupState
  limitRows?: number
  highlightStep?: WorkflowStepId
  calculatedRuleErrors?: Record<string, string | null>
}

function transformSheet({
  sheetName,
  rows,
  columnNames,
  allRowsBySheet,
  allColumnNames,
  headerState,
  headerOverrides,
  columnOrderState,
  dateState,
  textNormalizeState,
  numericCleanupState,
  calculatedState,
  nullState,
  findReplaceState,
  dedupState,
  lookupState,
  limitRows,
  highlightStep,
  calculatedRuleErrors = {},
}: TransformOptions): SheetPreview {
  if (!rows.length) {
    return {
      name: sheetName,
      rows: [[]],
      headerChanges: 0,
      columnOrderChanges: 0,
      dateChanges: 0,
      calculatedChanges: 0,
      nullChanges: 0,
      findChanges: 0,
      textNormalizeChanges: 0,
      numericChanges: 0,
      dedupeRemovals: 0,
      lookupAdds: 0,
      totalRows: 0,
      numericWarnings: { percentOverflow: {} },
    }
  }

  const { rows: orderedRows, order } = applyColumnOrder(rows, columnOrderState, sheetName)
  const working = orderedRows.map(row => [...row])
  const overridesForSheet = headerOverrides[sheetName] ?? {}
  const headerCleanupEnabled =
    headerState.enabled && (headerState.scope === 'all' || headerState.sheets.includes(sheetName))
  const canHighlightCells =
    Boolean(highlightStep) && highlightStep !== 'column-order' && highlightStep !== 'dedupe' && highlightStep !== 'run-download'
  const highlightMask: boolean[][] | null = canHighlightCells ? working.map(row => row.map(() => false)) : null
  const markHighlight = (rowIndex: number, columnIndex: number) => {
    if (!highlightMask) return
    if (!highlightMask[rowIndex]) highlightMask[rowIndex] = []
    highlightMask[rowIndex][columnIndex] = true
  }
  const pushHighlightColumn = (rowIndex: number, highlighted: boolean) => {
    if (!highlightMask) return
    if (!highlightMask[rowIndex]) highlightMask[rowIndex] = []
    highlightMask[rowIndex].push(highlighted)
  }
  const markStepHighlight = (step: WorkflowStepId, rowIndex: number, columnIndex: number) => {
    if (highlightStep === step) {
      markHighlight(rowIndex, columnIndex)
    }
  }
  let highlightNotice: string | null = null
  const originalWidth = rows[0]?.length ?? 0
  const previewMode = typeof limitRows === 'number'
  const dedupConfig = dedupState.configsBySheet[sheetName]
  const lookupConfig = lookupState.configsBySheet[sheetName]
  const hasDedupForSheet = Boolean(dedupState.enabled && dedupConfig && dedupConfig.keyColumns.length)
  const hasLookupForSheet = Boolean(
    lookupState.enabled &&
      lookupConfig &&
      lookupConfig.referenceSheet &&
      lookupConfig.importColumns.some(index => index != null) &&
      lookupConfig.joins.some(hasLookupJoinColumns),
  )
  if (highlightStep === 'column-order' && columnOrderState.enabled) {
    highlightNotice = 'Preview uses your custom column order.'
  }

  const originalIndexByPosition = order.reduce<Record<number, number>>((acc, originalIndex, position) => {
    acc[position] = originalIndex
    return acc
  }, {})

  let headerChanges = 0
  working[0] = working[0].map((cell, columnIndex) => {
    const originalIndex = originalIndexByPosition[columnIndex] ?? columnIndex
    const current = cell == null ? '' : String(cell)
    const fallbackLabel = columnNames[originalIndex] && columnNames[originalIndex].trim().length
      ? columnNames[originalIndex]
      : `Column ${originalIndex + 1}`
    let next = headerCleanupEnabled ? applyHeaderFormatting(cell, headerState) : current
    let changed = next !== current
    let manualOverrideApplied = false
    if (!next.trim().length && fallbackLabel) {
      const fallbackValue = headerCleanupEnabled ? applyHeaderFormatting(fallbackLabel, headerState) : fallbackLabel
      if (fallbackValue !== next) {
        next = fallbackValue
        changed = true
      }
    }
    const manualOverrideRaw = overridesForSheet[originalIndex]
    if (typeof manualOverrideRaw === 'string' && manualOverrideRaw.length) {
      const overrideValue = headerCleanupEnabled ? applyHeaderFormatting(manualOverrideRaw, headerState) : manualOverrideRaw
      if (overrideValue !== next) {
        next = overrideValue
        changed = true
      }
      manualOverrideApplied = true
    }
    if (changed && (headerCleanupEnabled || manualOverrideApplied)) {
      headerChanges += 1
      markStepHighlight('headers', 0, columnIndex)
    }
    return next
  })

  let dateChanges = 0
  let calculatedChanges = 0
  let nullChanges = 0
  let findChanges = 0
  let textNormalizeChanges = 0
  let numericChanges = 0
  let dedupeRemovals = 0
  let lookupAdds = 0
  const numericWarnings = { percentOverflow: {} as Record<number, number> }
  let lookupDiagnostics: LookupDiagnostics | undefined

  const dateConfigs = dateState.columns[sheetName] ?? {}
  const isDateColumn = (originalIndex: number) => {
    if (!dateState.enabled) return false
    if (dateState.mode === 'global') return true
    const config = dateConfigs[originalIndex]
    if (!config) return false
    return config.enabled
  }

  const findRules = getFindReplaceRulesForSheet(sheetName, findReplaceState.rulesBySheet)
  const calculatedRules = calculatedState.rulesBySheet[sheetName] ?? []
  const sheetRuleErrors = calculatedRuleErrors ?? {}
  const applicableCalculatedRules = calculatedState.enabled
    ? calculatedRules.filter(rule => rule.enabled && !sheetRuleErrors[rule.id])
    : []
  const textColumns = textNormalizeState.columns[sheetName] ?? {}
  const numericColumns = numericCleanupState.columns[sheetName] ?? {}

  const newIndexByOriginal = order.reduce<Record<number, number>>((acc, originalIndex, position) => {
    acc[originalIndex] = position
    return acc
  }, {})

  const getValueByOriginalIndex = (row: CellValue[], originalIndex: number) => {
    const position = newIndexByOriginal[originalIndex]
    if (position === undefined) return ''
    return row[position] ?? ''
  }

  const textGlobalOptions = {
    caseMode: textNormalizeState.defaultCaseMode,
    trimEdges: textNormalizeState.defaultTrimEdges,
    collapseSpaces: textNormalizeState.defaultCollapseSpaces,
  }
  const applyGlobalTextNormalize = textNormalizeState.enabled && textNormalizeState.mode !== 'per-column'
  const applyPerColumnTextNormalize =
    textNormalizeState.enabled &&
    (textNormalizeState.mode === 'per-column' || textNormalizeState.mode === 'global-with-overrides')

  const activeNullPatterns = nullState.patterns.filter(pattern => pattern.enabled)

  // Dedup/lookup previews rely on full-row context, so process every row when those features are active.
  const needsFullProcessing = !previewMode || hasDedupForSheet || hasLookupForSheet
  const rowProcessingLimit = needsFullProcessing
    ? working.length
    : previewMode
      ? Math.min((limitRows ?? 0) + 1, working.length)
      : working.length

  for (let rowIndex = 1; rowIndex < rowProcessingLimit; rowIndex += 1) {
    const row = working[rowIndex]
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const originalIndex = originalIndexByPosition[columnIndex] ?? columnIndex
      let cellValue = row[columnIndex]

      if (dateState.enabled && isDateColumn(originalIndex)) {
        const parsed = parseDateValue(cellValue)
        if (parsed) {
          const columnFormat =
            dateState.mode === 'global'
              ? dateState.defaultFormat
              : dateConfigs[originalIndex]?.format || dateState.defaultFormat
          const formatted = formatDateValue(parsed, columnFormat)
          if (formatted !== cellValue) {
            cellValue = formatted
            dateChanges += 1
            markStepHighlight('dates', rowIndex, columnIndex)
          }
        }
      }

      if (textNormalizeState.enabled) {
        const originalTextValue = cellValue
        let nextTextValue = cellValue
        let textChanged = false
        const columnConfig = textColumns[originalIndex]
        const skipGlobalForColumn =
          textNormalizeState.mode === 'global-with-overrides' && columnConfig && !columnConfig.enabled
        if (applyGlobalTextNormalize && !skipGlobalForColumn) {
          const { next, changed } = normalizeTextCell(nextTextValue, textGlobalOptions)
          if (changed) {
            nextTextValue = next
          }
          textChanged = textChanged || changed
        }
        if (applyPerColumnTextNormalize) {
          if (columnConfig?.enabled) {
            const { next, changed } = normalizeTextCell(nextTextValue, columnConfig)
            if (changed) {
              nextTextValue = next
            }
            textChanged = textChanged || changed
          }
        }
        if (textChanged && nextTextValue !== originalTextValue) {
          cellValue = nextTextValue
          textNormalizeChanges += 1
          markStepHighlight('text-normalize', rowIndex, columnIndex)
        } else {
          cellValue = nextTextValue
        }
      }

      if (numericCleanupState.enabled) {
        const numericConfig = numericColumns[originalIndex]
        if (numericConfig?.enabled) {
          const { next, changed, warning } = cleanNumericCell(cellValue, numericConfig)
          if (warning === 'percent-overflow') {
            numericWarnings.percentOverflow[originalIndex] =
              (numericWarnings.percentOverflow[originalIndex] ?? 0) + 1
          }
          if (changed) {
            cellValue = next
            numericChanges += 1
            markStepHighlight('numeric', rowIndex, columnIndex)
          }
        }
      }

      if (nullState.enabled) {
        const shouldReplace = activeNullPatterns.some(pattern => matchesPattern(cellValue, pattern))
        if (shouldReplace) {
          const nextValue = nullState.leaveEmpty ? '' : nullState.replacement
          if (nextValue !== cellValue) {
            cellValue = nextValue
            nullChanges += 1
            markStepHighlight('nulls', rowIndex, columnIndex)
          }
        }
      }

      if (findReplaceState.enabled && findRules.length) {
        const { next, changes } = applyFindReplaceRules(cellValue, originalIndex, findRules)
        if (changes > 0) {
          cellValue = next
          findChanges += changes
          markStepHighlight('find-replace', rowIndex, columnIndex)
        }
      }

      row[columnIndex] = cellValue ?? ''
    }

    if (applicableCalculatedRules.length) {
      applicableCalculatedRules.forEach(rule => {
        const sourceValues = rule.sources
          .map(original => getValueByOriginalIndex(row, original))
          .map(value => (value == null ? '' : String(value)))
        const delimiter = rule.delimiter ?? ''
        const result = computeCalculatedValue(rule.type, sourceValues, delimiter)
        row.push(result)
        if (highlightMask) {
          pushHighlightColumn(rowIndex, highlightStep === 'calculated')
        }
        if (result.length) calculatedChanges += 1
      })
    }

  }

  if (applicableCalculatedRules.length) {
    applicableCalculatedRules.forEach(rule => {
      working[0].push(rule.label || 'Calculated field')
      if (highlightMask) {
        pushHighlightColumn(0, highlightStep === 'calculated')
      }
    })
  }

  if (dedupConfig && hasDedupForSheet) {
    const headerRow = working[0]
    const headerMaskRow = highlightMask ? highlightMask[0] : null
    const keptRows: CellValue[][] = []
    const keptMaskRows: (boolean[] | null)[] = []
    const seen = new Map<string, { row: CellValue[]; index: number; mask: boolean[] | null }>()
    working.slice(1).forEach((row, relativeIndex) => {
      const maskRow = highlightMask ? highlightMask[relativeIndex + 1] ?? null : null
      const key = buildJoinKey(
        dedupConfig.keyColumns.map(originalIndex => getValueByOriginalIndex(row, originalIndex)),
      )
      if (!seen.has(key)) {
        const index = keptRows.length
        keptRows.push(row)
        keptMaskRows.push(maskRow)
        seen.set(key, { row, index, mask: maskRow })
        return
      }
      dedupeRemovals += 1
      const existing = seen.get(key)!
      if (dedupConfig.keepStrategy === 'last') {
        keptRows[existing.index] = row
        keptMaskRows[existing.index] = maskRow
        seen.set(key, { row, index: existing.index, mask: maskRow })
      }
      const target = keptRows[existing.index]
      for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
        const originalIndex = originalIndexByPosition[columnIndex] ?? -1
        if (dedupConfig.keyColumns.includes(originalIndex)) continue
        if (dedupConfig.numericStrategy === 'sum') {
          const left = Number(target[columnIndex])
          const right = Number(row[columnIndex])
          if (Number.isFinite(left) && Number.isFinite(right)) {
            target[columnIndex] = (left + right).toString()
          }
        }
        if (dedupConfig.textStrategy === 'concat') {
          const left = target[columnIndex] == null ? '' : String(target[columnIndex])
          const right = row[columnIndex] == null ? '' : String(row[columnIndex])
          if (right.length) {
            target[columnIndex] = left.length ? `${left} | ${right}` : right
          }
        }
      }
    })
    working.length = 0
    working.push(headerRow, ...keptRows)
    if (highlightMask) {
      const nextMaskRows: boolean[][] = []
      nextMaskRows.push(headerMaskRow ? [...headerMaskRow] : [])
      keptMaskRows.forEach(mask => {
        nextMaskRows.push(mask ? [...mask] : [])
      })
      highlightMask.length = 0
      nextMaskRows.forEach(rowMask => highlightMask.push(rowMask))
    }
    if (highlightStep === 'dedupe' && hasDedupForSheet) {
      highlightNotice =
        dedupeRemovals > 0
          ? `${dedupeRemovals} duplicate rows removed in this preview.`
          : 'No duplicates detected in the preview rows.'
    }
  }

  if (lookupConfig && hasLookupForSheet) {
    const referenceSheetName = lookupConfig.referenceSheet
    if (referenceSheetName) {
      const referenceRows = allRowsBySheet[referenceSheetName]
    const joinPairs = lookupConfig.joins.filter(hasLookupJoinColumns)
    const importColumns = lookupConfig.importColumns.filter((index): index is number => index != null)
    if (referenceRows?.length && joinPairs.length && importColumns.length) {
      const referenceTextColumns = textNormalizeState.columns[referenceSheetName] ?? {}
      const referenceNumericColumns = numericCleanupState.columns[referenceSheetName] ?? {}
      const referenceDateConfigs = dateState.columns[referenceSheetName] ?? {}
      const referenceFindRules = getFindReplaceRulesForSheet(referenceSheetName, findReplaceState.rulesBySheet)
      const isReferenceDateColumn = (originalIndex: number) => {
        if (!dateState.enabled) return false
        const config = referenceDateConfigs[originalIndex]
        if (!config) return false
        return config.enabled
      }
      const transformReferenceCell = (value: CellValue, originalIndex: number) => {
        let cellValue = value
        if (dateState.enabled && isReferenceDateColumn(originalIndex)) {
          const parsed = parseDateValue(cellValue)
          if (parsed) {
            const columnFormat =
              dateState.mode === 'global'
                ? dateState.defaultFormat
                : referenceDateConfigs[originalIndex]?.format || dateState.defaultFormat
            const formatted = formatDateValue(parsed, columnFormat)
            cellValue = formatted
          }
        }
        if (textNormalizeState.enabled) {
          let nextTextValue = cellValue
          const columnConfig = referenceTextColumns[originalIndex]
          const skipGlobalForColumn =
            textNormalizeState.mode === 'global-with-overrides' && columnConfig && !columnConfig.enabled
          if (applyGlobalTextNormalize && !skipGlobalForColumn) {
            const { next } = normalizeTextCell(nextTextValue, textGlobalOptions)
            nextTextValue = next
          }
          if (applyPerColumnTextNormalize) {
            if (columnConfig?.enabled) {
              const { next } = normalizeTextCell(nextTextValue, columnConfig)
              nextTextValue = next
            }
          }
          cellValue = nextTextValue
        }
        if (numericCleanupState.enabled) {
          const numericConfig = referenceNumericColumns[originalIndex]
          if (numericConfig?.enabled) {
            const { next } = cleanNumericCell(cellValue, numericConfig)
            cellValue = next
          }
        }
        if (nullState.enabled && activeNullPatterns.length) {
          const shouldReplace = activeNullPatterns.some(pattern => matchesPattern(cellValue, pattern))
          if (shouldReplace) {
            cellValue = nullState.leaveEmpty ? '' : nullState.replacement
          }
        }
        if (findReplaceState.enabled && referenceFindRules.length) {
          const { next } = applyFindReplaceRules(cellValue, originalIndex, referenceFindRules)
          cellValue = next
        }
        return cellValue ?? ''
      }
      const referenceGroups = new Map<string, CellValue[][]>()
      referenceRows.slice(1).forEach(refRow => {
        const key = buildJoinKey(
          joinPairs.map(pair => transformReferenceCell(refRow[pair.referenceColumn], pair.referenceColumn)),
        )
        const existing = referenceGroups.get(key)
        if (existing) {
          existing.push(refRow)
        } else {
          referenceGroups.set(key, [refRow])
        }
      })
      const duplicateKeys = Array.from(referenceGroups.values()).filter(group => group.length > 1).length
      const strategy = lookupConfig.duplicateStrategy || 'first'
      lookupDiagnostics = {
        matchedRows: 0,
        unmatchedRows: 0,
        duplicateKeys,
        aborted: duplicateKeys > 0 && strategy === 'abort',
        strategy,
      }
      if (lookupDiagnostics.aborted) {
        highlightNotice =
          'Lookup aborted: duplicate reference keys detected. Choose how to resolve them or dedupe the reference sheet.'
      } else {
        const referenceMap = new Map<string, CellValue[]>()
        referenceGroups.forEach((group, key) => {
          const resolvedRow = strategy === 'last' ? group[group.length - 1] : group[0]
          referenceMap.set(key, resolvedRow)
        })
        working.slice(1).forEach((row, relativeRowIndex) => {
          const previewRowIndex = relativeRowIndex + 1
          const key = buildJoinKey(joinPairs.map(pair => getValueByOriginalIndex(row, pair.sourceColumn)))
          const refRow = referenceMap.get(key)
          if (refRow) {
            lookupDiagnostics!.matchedRows += 1
          } else {
            lookupDiagnostics!.unmatchedRows += 1
          }
          importColumns.forEach(refIndex => {
            const value = refRow ? transformReferenceCell(refRow[refIndex], refIndex) : ''
            row.push(value ?? '')
            if (highlightMask) {
              pushHighlightColumn(previewRowIndex, highlightStep === 'lookup')
            }
            if (value != null && String(value).trim().length) lookupAdds += 1
          })
        })
        const referenceHeaders = allColumnNames[referenceSheetName] ?? []
        importColumns.forEach(refIndex => {
          const label = referenceHeaders[refIndex] ?? `Column ${refIndex + 1}`
          working[0].push(`${lookupConfig.prefix || 'Lookup'}: ${label}`)
          if (highlightMask) {
            pushHighlightColumn(0, highlightStep === 'lookup')
          }
        })
        if (lookupDiagnostics.duplicateKeys > 0) {
          highlightNotice = `Lookup resolved ${lookupDiagnostics.duplicateKeys} duplicate key${
            lookupDiagnostics.duplicateKeys === 1 ? '' : 's'
          } by keeping the ${strategy === 'first' ? 'first' : 'last'} match.`
        }
      }
    }
    }
  }

  if (previewMode && hasLookupForSheet && lookupAdds === 0) {
    console.debug(`[Lookup] Preview added 0 matches for "${sheetName}". Check lookup configuration.`)
  }

  const finalRows = typeof limitRows === 'number' ? working.slice(0, limitRows + 1) : working
  const finalMask =
    highlightMask && canHighlightCells
      ? finalRows.map((row, index) => {
          const rowMask = highlightMask[index] ?? []
          return row.map((_, columnIndex) => rowMask[columnIndex] ?? false)
        })
      : undefined

  return {
    name: sheetName,
    rows: finalRows,
    headerChanges,
    columnOrderChanges: columnOrderState.enabled ? 1 : 0,
    dateChanges,
    calculatedChanges,
    nullChanges,
    findChanges,
    textNormalizeChanges,
    numericChanges,
    dedupeRemovals,
    lookupAdds,
    totalRows: working.length - 1,
    numericWarnings,
    lookupDiagnostics,
    highlightMask: finalMask,
    highlightNotice,
  }
}

export { transformSheet }

// ---------- Component ----------

export default function DillonsDataCleanerClient() {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [sheetOrder, setSheetOrder] = useState<string[]>([])
  const [rowsBySheet, setRowsBySheet] = useState<Record<string, CellValue[][]>>({})
  const [originalRowsBySheet, setOriginalRowsBySheet] = useState<Record<string, CellValue[][]>>({})
  const [columnNamesBySheet, setColumnNamesBySheet] = useState<Record<string, string[]>>({})
  const [rawColumnNamesBySheet, setRawColumnNamesBySheet] = useState<Record<string, string[]>>({})
  const [headerOverrides, setHeaderOverrides] = useState<HeaderOverrides>({})
  const [headerRenameDrafts, setHeaderRenameDrafts] = useState<Record<string, Record<number, string>>>({})
  const [headerRenameErrors, setHeaderRenameErrors] = useState<Record<string, Record<number, string | null>>>({})
  const [selectedSheets, setSelectedSheets] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState<string | null>(null)
  const [nullState, setNullState] = useState<NullState>(() => createDefaultNullState())
  const [headerState, setHeaderState] = useState<HeaderState>(() => createDefaultHeaderState())
  const [columnOrderState, setColumnOrderState] = useState<ColumnOrderState>({
    enabled: false,
    orders: {},
    sortModeBySheet: {},
  })
  const [findReplaceState, setFindReplaceState] = useState<FindReplaceState>({ enabled: false, rulesBySheet: {} })
  const [dateState, setDateState] = useState<DateState>({ enabled: false, mode: 'global', defaultFormat: DEFAULT_DATE_FORMAT, columns: {} })
  const [calculatedState, setCalculatedState] = useState<CalculatedState>({ enabled: false, rulesBySheet: {} })
  const [textNormalizeState, setTextNormalizeState] = useState<TextNormalizeState>(() => createDefaultTextNormalizeState())
  const [numericCleanupState, setNumericCleanupState] = useState<NumericCleanupState>(() => createDefaultNumericCleanupState())
  const [dedupState, setDedupState] = useState<DedupState>(() => createDefaultDedupState())
  const [lookupState, setLookupState] = useState<LookupState>(() => createDefaultLookupState())
  const [customPatternInput, setCustomPatternInput] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState<WorkflowStepId>(FIRST_STEP)
  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const [hasRunTransformations, setHasRunTransformations] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [columnOrderSheet, setColumnOrderSheet] = useState<string | null>(null)
  const [findReplaceSheet, setFindReplaceSheet] = useState<string | null>(null)
  const [activeFindReplaceRuleId, setActiveFindReplaceRuleId] = useState<string | null>(null)
  const [dateSheet, setDateSheet] = useState<string | null>(null)
  const [calculatedSheet, setCalculatedSheet] = useState<string | null>(null)
  const [showCalculatedErrors, setShowCalculatedErrors] = useState(false)
  const [textNormalizeSheet, setTextNormalizeSheet] = useState<string | null>(null)
  const [numericSheet, setNumericSheet] = useState<string | null>(null)
  const [dedupSheet, setDedupSheet] = useState<string | null>(null)
  const [lookupSheet, setLookupSheet] = useState<string | null>(null)
  const [dragColumn, setDragColumn] = useState<{ sheet: string; index: number } | null>(null)
  const [isHeaderModalOpen, setHeaderModalOpen] = useState(false)
  const [headerRenameSheet, setHeaderRenameSheet] = useState<string | null>(null)
  const [headerRenameScope, setHeaderRenameScope] = useState<'sheet' | 'all'>('sheet')

  const numericDetectionBySheet = useMemo(() => {
    const map: Record<string, Record<number, NumericDetection>> = {}
    Object.entries(rowsBySheet).forEach(([name, rows]) => {
      map[name] = detectNumericColumns(rows ?? [])
    })
    return map
  }, [rowsBySheet])

  const { calculatedInlineErrorsBySheet, calculatedBlockingErrorsBySheet } = useMemo(() => {
    const inlineMap: Record<string, Record<string, string | null>> = {}
    const blockingMap: Record<string, Record<string, string | null>> = {}
    Object.entries(calculatedState.rulesBySheet).forEach(([sheetName, rules]) => {
      inlineMap[sheetName] = {}
      blockingMap[sheetName] = {}
      const columnCount = columnNamesBySheet[sheetName]?.length ?? 0
      const detection = numericDetectionBySheet[sheetName] ?? {}
      rules.forEach(rule => {
        const { inline, blocking } = getCalculatedRuleErrors(rule, columnCount, detection, showCalculatedErrors)
        inlineMap[sheetName][rule.id] = inline
        blockingMap[sheetName][rule.id] = blocking
      })
    })
    return { calculatedInlineErrorsBySheet: inlineMap, calculatedBlockingErrorsBySheet: blockingMap }
  }, [calculatedState.rulesBySheet, columnNamesBySheet, numericDetectionBySheet, showCalculatedErrors])

  const hasBlockingCalculatedErrors = useMemo(() => {
    if (!calculatedState.enabled) return false
    return Object.values(calculatedBlockingErrorsBySheet).some(ruleMap => Object.values(ruleMap).some(Boolean))
  }, [calculatedBlockingErrorsBySheet, calculatedState.enabled])

  const resetTransforms = useCallback(() => {
    setHasRunTransformations(false)
    setStatusMessage(null)
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      const allowed = ACCEPTED_TYPES.some(type => {
        if (type.startsWith('.')) return extension === type.slice(1)
        return file.type === type
      })

      if (!allowed) {
        setErrorMessage('Please upload a CSV, XLS, or XLSX file.')
        return
      }

      try {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
        if (!workbook.SheetNames.length) throw new Error('No sheets found')

        const mapped: Record<string, CellValue[][]> = {}
        const originalMap: Record<string, CellValue[][]> = {}
        const names: Record<string, string[]> = {}
        const orders: Record<string, number[]> = {}
        const sortModes: Record<string, ColumnSortMode> = {}
        const dateMap: Record<string, Record<number, DateColumnConfig>> = {}
        const textColumnMap: Record<string, Record<number, TextNormalizeColumnConfig>> = {}
        const numericColumnMap: Record<string, Record<number, NumericColumnConfig>> = {}
        const dedupConfigMap: Record<string, DedupConfig> = {}
        const lookupConfigMap: Record<string, LookupConfig> = {}

        workbook.SheetNames.forEach(name => {
          const worksheet = workbook.Sheets[name]
          const raw = (XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            // Preserve intentional blank spacer rows so no-op workflows export exactly what was ingested.
            blankrows: true,
            raw: false,
          }) as CellValue[][]) ?? [[]]
          const normalized = normalizeRows(raw)
          mapped[name] = normalized
          originalMap[name] = cloneRows(normalized)
          const headers = normalized[0] ?? []
          names[name] = headers.map((cell, idx) => {
            const label = renderCell(cell)
            return label.length ? label : `Column ${idx + 1}`
          })
          orders[name] = getDefaultOrder(headers.length)
          sortModes[name] = null

          const dateDetection = analyzeDateColumns(normalized)
          const columnConfigs: Record<number, DateColumnConfig> = {}
          headers.forEach((_, idx) => {
            columnConfigs[idx] = {
              enabled: dateDetection[idx]?.enabled ?? false,
              format: DEFAULT_DATE_FORMAT,
              confidence: dateDetection[idx]?.confidence ?? 0,
              sampleCount: dateDetection[idx]?.sampleCount ?? 0,
              guardReason: dateDetection[idx]?.guardReason ?? null,
            }
          })
          dateMap[name] = columnConfigs

          const textColumns: Record<number, TextNormalizeColumnConfig> = {}
          headers.forEach((_, idx) => {
            textColumns[idx] = {
              enabled: false,
              caseMode: 'lower',
              trimEdges: true,
              collapseSpaces: true,
            }
          })
          textColumnMap[name] = textColumns

          const numericDetection = detectNumericColumns(normalized)
          const numericColumns: Record<number, NumericColumnConfig> = {}
          headers.forEach((_, idx) => {
            const detection = numericDetection[idx]
            const isNumeric = Boolean(detection?.isNumeric)
            numericColumns[idx] = buildNumericConfigFromDetection(detection, isNumeric)
          })
          numericColumnMap[name] = numericColumns

          dedupConfigMap[name] = {
            keyColumns: [],
            keepStrategy: 'first',
            numericStrategy: 'keep',
            textStrategy: 'keep',
          }
          const fallbackReference = workbook.SheetNames.find(sheet => sheet !== name) ?? null
          lookupConfigMap[name] = {
            referenceSheet: fallbackReference,
            prefix: 'Lookup',
            joins: [],
            importColumns: [],
            duplicateStrategy: 'first',
          }
        })

        const clonedNames = Object.entries(names).reduce<Record<string, string[]>>((acc, [sheet, labels]) => {
          acc[sheet] = [...labels]
          return acc
        }, {})
        setRowsBySheet(mapped)
        setOriginalRowsBySheet(originalMap)
        setRawColumnNamesBySheet(names)
        setColumnNamesBySheet(clonedNames)
        setSheetOrder(workbook.SheetNames)
        setSelectedSheets(workbook.SheetNames)
        setActiveSheet(workbook.SheetNames[0])
        setColumnOrderState({ enabled: false, orders, sortModeBySheet: sortModes })
        setFindReplaceState({ enabled: false, rulesBySheet: {} })
        setCalculatedState({ enabled: false, rulesBySheet: {} })
        setDateState({ enabled: false, mode: 'global', defaultFormat: DEFAULT_DATE_FORMAT, columns: dateMap })
        setTextNormalizeState({
          enabled: false,
          mode: 'global',
          defaultCaseMode: 'lower',
          defaultTrimEdges: true,
          defaultCollapseSpaces: true,
          columns: textColumnMap,
        })
        setNumericCleanupState({ enabled: false, columns: numericColumnMap })
        setDedupState({ enabled: false, configsBySheet: dedupConfigMap })
        setLookupState({ enabled: false, configsBySheet: lookupConfigMap })
        setNullState(createDefaultNullState())
        setHeaderState(createDefaultHeaderState())
        setHeaderOverrides({})
        setHeaderRenameDrafts({})
        setHeaderRenameErrors({})
        setCustomPatternInput('')
        setColumnOrderSheet(null)
        setFindReplaceSheet(null)
        setDateSheet(null)
        setCalculatedSheet(null)
        setShowCalculatedErrors(false)
        setTextNormalizeSheet(null)
        setNumericSheet(null)
        setDedupSheet(null)
        setLookupSheet(null)
        setHeaderRenameSheet(null)
        setHeaderModalOpen(false)
        setHeaderRenameScope('sheet')
        setActiveStep(FIRST_STEP)
        setAdvancedExpanded(false)
        setErrorMessage(null)
        setFileInfo({
          name: file.name,
          size: file.size,
          type: file.type,
          isXlsx: extension === 'xlsx' || extension === 'xls' || file.type.includes('spreadsheet'),
        })
        resetTransforms()
      } catch (error) {
        console.error(error)
        setErrorMessage('We could not parse that file. Please try another CSV or XLSX.')
      }
    },
    [resetTransforms],
  )

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return
      await processFile(file)
      event.target.value = ''
    },
    [processFile],
  )

  const handleDragOver = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLLabelElement>) => {
      event.preventDefault()
      setIsDragActive(false)
      const file = event.dataTransfer?.files?.[0]
      if (file) {
        await processFile(file)
      }
    },
    [processFile],
  )

  const handlePatternToggle = useCallback(
    (patternId: string) => {
      setNullState(current => ({
        ...current,
        patterns: current.patterns.map(pattern =>
          pattern.id === patternId ? { ...pattern, enabled: !pattern.enabled } : pattern,
        ),
      }))
      resetTransforms()
    },
    [resetTransforms],
  )

  const handleAddCustomPattern = useCallback(() => {
    const value = customPatternInput.trim()
    if (!value) return
    setNullState(current => ({
      ...current,
      patterns: [
        ...current.patterns,
        {
          id: `custom-${Date.now()}`,
          label: value,
          helper: 'Custom token',
          enabled: true,
          type: 'custom',
          value,
        },
      ],
    }))
    setCustomPatternInput('')
    resetTransforms()
  }, [customPatternInput, resetTransforms])

  const handleRemoveCustomPattern = useCallback(
    (patternId: string) => {
      setNullState(current => ({
        ...current,
        patterns: current.patterns.filter(pattern => pattern.id !== patternId),
      }))
      resetTransforms()
    },
    [resetTransforms],
  )

  const handleSelectAllSheets = useCallback(() => {
    setSelectedSheets(sheetOrder)
    setActiveSheet(sheetOrder[0] ?? null)
    resetTransforms()
  }, [resetTransforms, sheetOrder])

  const handleClearSheets = useCallback(() => {
    setSelectedSheets([])
    setActiveSheet(null)
    resetTransforms()
  }, [resetTransforms])

  const handleSheetToggle = useCallback(
    (sheetName: string) => {
      setSelectedSheets(prev => {
        const exists = prev.includes(sheetName)
        const next = exists ? prev.filter(name => name !== sheetName) : [...prev, sheetName]
        setActiveSheet(current => {
          if (!next.length) return null
          if (current && next.includes(current)) return current
          return next[0]
        })
        return next
      })
      resetTransforms()
    },
    [resetTransforms],
  )

  const setHeaderRenameError = useCallback((sheetName: string, columnIndex: number, message: string | null) => {
    setHeaderRenameErrors(current => {
      const next = { ...current }
      const sheetErrors = { ...(next[sheetName] ?? {}) }
      if (message) {
        sheetErrors[columnIndex] = message
        next[sheetName] = sheetErrors
      } else {
        delete sheetErrors[columnIndex]
        if (Object.keys(sheetErrors).length) {
          next[sheetName] = sheetErrors
        } else {
          delete next[sheetName]
        }
      }
      return next
    })
  }, [])

  const focusPreviewSheet = useCallback(
    (sheetName: string) => {
      if (!sheetName || !sheetOrder.includes(sheetName)) return
      let added = false
      setSelectedSheets(prev => {
        if (prev.includes(sheetName)) return prev
        added = true
        const combined = [...prev, sheetName].sort((a, b) => sheetOrder.indexOf(a) - sheetOrder.indexOf(b))
        return combined
      })
      setActiveSheet(sheetName)
      if (added) {
        resetTransforms()
      }
    },
    [sheetOrder, resetTransforms],
  )

  const getDefaultHeaderLabel = useCallback(
    (sheetName: string, columnIndex: number) => {
      const raw = rawColumnNamesBySheet[sheetName]?.[columnIndex]
      if (raw && raw.trim().length) return raw
      return `Column ${columnIndex + 1}`
    },
    [rawColumnNamesBySheet],
  )

  const formatHeaderForComparison = useCallback(
    (sheetName: string, value: string) => {
      const shouldFormat =
        headerState.enabled && (headerState.scope === 'all' || headerState.sheets.includes(sheetName))
      const base = shouldFormat ? applyHeaderFormatting(value, headerState) : value
      return base.trim().toLowerCase()
    },
    [headerState],
  )

  const validateHeaderOverride = useCallback(
    (sheetName: string, columnIndex: number, finalLabel: string) => {
      const rowWidth = rowsBySheet[sheetName]?.[0]?.length ?? 0
      const labelWidth = columnNamesBySheet[sheetName]?.length ?? 0
      const totalColumns = Math.max(rowWidth, labelWidth, columnIndex + 1)
      const normalizedTarget = formatHeaderForComparison(sheetName, finalLabel)
      if (!normalizedTarget.length) return null
      const resolveLabel = (index: number) => {
        const override = headerOverrides[sheetName]?.[index]
        const stored = columnNamesBySheet[sheetName]?.[index]
        const raw = override ?? stored ?? getDefaultHeaderLabel(sheetName, index)
        return raw?.trim().length ? raw : getDefaultHeaderLabel(sheetName, index)
      }
      const seen = new Map<string, number>()
      for (let idx = 0; idx < totalColumns; idx += 1) {
        const label = idx === columnIndex ? finalLabel : resolveLabel(idx)
        const normalized = formatHeaderForComparison(sheetName, label)
        if (!normalized.length) continue
        const prior = seen.get(normalized)
        if (prior != null && prior !== idx) {
          return `Column name "${label}" is already in use.`
        }
        seen.set(normalized, idx)
      }
      return null
    },
    [columnNamesBySheet, formatHeaderForComparison, getDefaultHeaderLabel, headerOverrides, rowsBySheet],
  )

  const handleHeaderOverrideChange = useCallback(
    (sheetName: string, columnIndex: number, value: string) => {
      const trimmed = value.trim()
      if (!trimmed.length) {
        setHeaderRenameError(sheetName, columnIndex, null)
        return false
      }

      const targetSheets = headerRenameScope === 'all' ? sheetOrder : [sheetName]
      let blockingError: string | null = null
      targetSheets.forEach(target => {
        if (blockingError) return
        const error = validateHeaderOverride(target, columnIndex, value)
        if (error) {
          blockingError =
            headerRenameScope === 'all' ? `${error} (conflict on ${target})` : error
        }
      })

      if (blockingError) {
        setHeaderRenameError(sheetName, columnIndex, blockingError)
        return false
      }

      setHeaderRenameError(sheetName, columnIndex, null)
      setHeaderOverrides(current => {
        const next = { ...current }
        targetSheets.forEach(target => {
          const baseLabel = getDefaultHeaderLabel(target, columnIndex)
          const shouldStoreOverride = value !== baseLabel
          const sheetOverrides = { ...(next[target] ?? {}) }
          if (shouldStoreOverride) {
            sheetOverrides[columnIndex] = value
            next[target] = sheetOverrides
          } else {
            delete sheetOverrides[columnIndex]
            if (Object.keys(sheetOverrides).length) {
              next[target] = sheetOverrides
            } else {
              delete next[target]
            }
          }
        })
        return next
      })
      setColumnNamesBySheet(current => {
        const next = { ...current }
        targetSheets.forEach(target => {
          const baseLabel = getDefaultHeaderLabel(target, columnIndex)
          const finalLabel = value.length ? value : baseLabel
          const existing = next[target] ? [...next[target]] : []
          if (existing.length <= columnIndex) {
            const fillCount = columnIndex - existing.length + 1
            for (let i = 0; i < fillCount; i += 1) {
              existing.push(getDefaultHeaderLabel(target, existing.length))
            }
          }
          existing[columnIndex] = finalLabel
          next[target] = existing
        })
        return next
      })
      resetTransforms()
      return true
    },
    [
      getDefaultHeaderLabel,
      headerRenameScope,
      resetTransforms,
      setHeaderRenameError,
      sheetOrder,
      validateHeaderOverride,
    ],
  )

  const handleHeaderOverrideReset = useCallback(
    (sheetName: string, columnIndex: number) => {
      setHeaderRenameDrafts(current => {
        const next = { ...current }
        if (!next[sheetName]) return current
        const sheetDrafts = { ...next[sheetName] }
        delete sheetDrafts[columnIndex]
        if (Object.keys(sheetDrafts).length) {
          next[sheetName] = sheetDrafts
        } else {
          delete next[sheetName]
        }
        return next
      })
      handleHeaderOverrideChange(sheetName, columnIndex, getDefaultHeaderLabel(sheetName, columnIndex))
    },
    [getDefaultHeaderLabel, handleHeaderOverrideChange],
  )

  const handleOpenHeaderModal = useCallback(() => {
    if (!sheetOrder.length) return
    setHeaderModalOpen(true)
    setHeaderRenameSheet(current => current ?? sheetOrder[0])
  }, [sheetOrder])

  const handleCloseHeaderModal = useCallback(() => {
    setHeaderModalOpen(false)
    setHeaderRenameSheet(null)
    setHeaderRenameDrafts({})
    setHeaderRenameErrors({})
    setHeaderRenameScope('sheet')
  }, [])

  const previewSheets = useMemo(() => {
    if (!selectedSheets.length) return []
    return selectedSheets
      .filter(name => rowsBySheet[name])
      .map(name =>
        transformSheet({
          sheetName: name,
          rows: rowsBySheet[name],
          columnNames: columnNamesBySheet[name] ?? [],
          allRowsBySheet: rowsBySheet,
          allColumnNames: columnNamesBySheet,
          headerState,
          headerOverrides,
          columnOrderState,
          dateState,
          textNormalizeState,
          numericCleanupState,
          calculatedState,
          nullState,
          findReplaceState,
          dedupState,
          lookupState,
          limitRows: PREVIEW_ROW_LIMIT,
          highlightStep: activeStep,
          calculatedRuleErrors: calculatedBlockingErrorsBySheet[name],
        }),
       )
  }, [
    selectedSheets,
    rowsBySheet,
    columnNamesBySheet,
    headerState,
    columnOrderState,
    dateState,
    textNormalizeState,
    numericCleanupState,
    calculatedState,
    nullState,
    findReplaceState,
    dedupState,
    lookupState,
    activeStep,
    headerOverrides,
    calculatedBlockingErrorsBySheet,
  ])

  const numericWarningsBySheet = useMemo(() => {
    const map: Record<string, SheetPreview['numericWarnings']> = {}
    previewSheets.forEach(sheet => {
      map[sheet.name] = sheet.numericWarnings
    })
    return map
  }, [previewSheets])

  const lookupDiagnosticsBySheet = useMemo(() => {
    const map: Record<string, LookupDiagnostics | undefined> = {}
    previewSheets.forEach(sheet => {
      if (sheet.lookupDiagnostics) {
        map[sheet.name] = sheet.lookupDiagnostics
      }
    })
    return map
  }, [previewSheets])

  const aggregatedStats = useMemo(() => {
    return previewSheets.reduce(
      (acc, sheet) => {
        acc.headerChanges += sheet.headerChanges
        acc.columnOrderChanges += sheet.columnOrderChanges
        acc.dateChanges += sheet.dateChanges
        acc.calculatedChanges += sheet.calculatedChanges
        acc.nullChanges += sheet.nullChanges
        acc.findChanges += sheet.findChanges
        acc.textNormalizeChanges += sheet.textNormalizeChanges
        acc.numericChanges += sheet.numericChanges
        acc.dedupeRemovals += sheet.dedupeRemovals
        acc.lookupAdds += sheet.lookupAdds
        return acc
      },
      {
        headerChanges: 0,
        columnOrderChanges: 0,
        dateChanges: 0,
        calculatedChanges: 0,
        nullChanges: 0,
        findChanges: 0,
        textNormalizeChanges: 0,
        numericChanges: 0,
        dedupeRemovals: 0,
        lookupAdds: 0,
      },
    )
  }, [previewSheets])

  const aggregatedPreviewSummary = useMemo(() => {
    return [
      { label: 'Header tweaks', value: aggregatedStats.headerChanges },
      { label: 'Column reorders', value: aggregatedStats.columnOrderChanges },
      { label: 'Date formats', value: aggregatedStats.dateChanges },
      { label: 'Text cleanups', value: aggregatedStats.textNormalizeChanges },
      { label: 'Numeric cleanups', value: aggregatedStats.numericChanges },
      { label: 'Null replacements', value: aggregatedStats.nullChanges },
      { label: 'Find & replace hits', value: aggregatedStats.findChanges },
      { label: 'Calculated values', value: aggregatedStats.calculatedChanges },
      { label: 'Dedup removals', value: aggregatedStats.dedupeRemovals },
      { label: 'Lookup values', value: aggregatedStats.lookupAdds },
    ].filter(entry => entry.value > 0)
  }, [aggregatedStats])

  const activePreview = useMemo(() => {
    if (!previewSheets.length) return null
    if (!activeSheet) return previewSheets[0]
    return previewSheets.find(sheet => sheet.name === activeSheet) ?? previewSheets[0]
  }, [activeSheet, previewSheets])

  const formatChangeCount = (count: number, noun: string) => {
    const plural = count === 1 ? '' : 's'
    return `${count.toLocaleString()} ${noun}${plural}`
  }

  const previewWindowLabel = (preview: SheetPreview | null) => {
    if (!preview) return ''
    const previewRows = Math.max(0, preview.rows.length - 1)
    if (!previewRows) return 'preview rows'
    return `${previewRows} preview row${previewRows === 1 ? '' : 's'}`
  }

  const getPreviewSummaryForStep = (stepId: WorkflowStepId, preview: SheetPreview | null) => {
    if (!preview) return null
    const windowLabel = previewWindowLabel(preview)
    switch (stepId) {
      case 'headers':
        if (!headerState.enabled) return 'Header cleanup is currently disabled.'
        if (headerState.scope === 'some' && !headerState.sheets.includes(preview.name)) {
          return 'Header cleanup is disabled for this sheet.'
        }
        return preview.headerChanges
          ? `${formatChangeCount(preview.headerChanges, 'header tweak')} in ${preview.name} (${windowLabel}).`
          : `No header changes detected in ${windowLabel}.`
      case 'column-order':
        return columnOrderState.enabled
          ? `Preview uses your drag-and-drop column order for ${preview.name}.`
          : 'Column order step is currently disabled.'
      case 'dates':
        if (!dateState.enabled) return 'Date formatting is currently disabled.'
        return preview.dateChanges
          ? `${formatChangeCount(preview.dateChanges, 'date reformat')} in ${windowLabel}.`
          : `No date matches found in ${windowLabel}.`
      case 'text-normalize':
        if (!textNormalizeState.enabled) return 'Case & whitespace normalization is currently disabled.'
        return preview.textNormalizeChanges
          ? `${formatChangeCount(preview.textNormalizeChanges, 'text normalization')} in ${windowLabel}.`
          : `No text normalization changes detected in ${windowLabel}.`
      case 'numeric':
        if (!numericCleanupState.enabled) return 'Numeric cleanup is currently disabled.'
        return preview.numericChanges
          ? `${formatChangeCount(preview.numericChanges, 'numeric cleanup')} in ${windowLabel}.`
          : `No numeric cleanups detected in ${windowLabel}.`
      case 'nulls':
        if (!nullState.enabled) return 'Null replacement is currently disabled.'
        return preview.nullChanges
          ? `${formatChangeCount(preview.nullChanges, 'null replacement')} in ${windowLabel}.`
          : `No null-like tokens collapsed in ${windowLabel}.`
      case 'find-replace':
        if (!findReplaceState.enabled) return 'Find & replace is currently disabled.'
        return preview.findChanges
          ? `${formatChangeCount(preview.findChanges, 'replacement hit')} in ${windowLabel}.`
          : `No replacements triggered in ${windowLabel}.`
      case 'calculated':
        if (!calculatedState.enabled) return 'Calculated fields are currently disabled.'
        return preview.calculatedChanges
          ? `${formatChangeCount(preview.calculatedChanges, 'calculated cell')} appended in ${windowLabel}.`
          : 'Calculated fields added no values in the preview rows.'
      case 'dedupe':
        return dedupState.enabled
          ? preview.dedupeRemovals
            ? `${formatChangeCount(preview.dedupeRemovals, 'duplicate row')} removed in ${windowLabel}.`
            : `No duplicates detected in ${windowLabel}.`
          : 'Deduplication is currently disabled.'
      case 'lookup':
        return lookupState.enabled
          ? preview.lookupAdds
            ? `${formatChangeCount(preview.lookupAdds, 'lookup value')} appended in ${windowLabel}.`
            : `No lookup matches found in ${windowLabel}.`
          : 'Lookup step is currently disabled.'
      default:
        return null
    }
  }

  const handleRunTransformations = useCallback(() => {
    if (!fileInfo) {
      setErrorMessage('Upload a file before running transformations.')
      return
    }
    if (!selectedSheets.length) {
      setErrorMessage('Select at least one sheet to transform.')
      return
    }
    if (hasBlockingCalculatedErrors) {
      setShowCalculatedErrors(true)
      setErrorMessage('Fix calculated field errors before running transformations.')
      return
    }
    setHasRunTransformations(true)
    setStatusMessage('Transformations applied. Download is now ready.')
    setErrorMessage(null)
  }, [fileInfo, selectedSheets.length, hasBlockingCalculatedErrors])

  const isHeaderCleanupActiveForSheet = useCallback(
    (sheetName: string) =>
      headerState.enabled && (headerState.scope === 'all' || headerState.sheets.includes(sheetName)),
    [headerState.enabled, headerState.scope, headerState.sheets],
  )

  const handleDownload = useCallback(async () => {
    if (!fileInfo) {
      setErrorMessage('Upload a file before downloading.')
      return
    }
    if (!hasRunTransformations) {
      setErrorMessage('Run the transformations before downloading the cleaned file.')
      return
    }
    if (!sheetOrder.length || !selectedSheets.length) {
      setErrorMessage('Select at least one sheet to transform.')
      return
    }
    if (hasBlockingCalculatedErrors) {
      setShowCalculatedErrors(true)
      setErrorMessage('Fix calculated field errors before downloading.')
      return
    }

    try {
      const prefixed = `dillons_data_cleaner_${fileInfo.name}`
      const sheetHasTransforms = (sheetName: string) => {
        if (isHeaderCleanupActiveForSheet(sheetName)) return true
        if (Object.keys(headerOverrides[sheetName] ?? {}).length) return true
        if (columnOrderState.enabled) return true
        if (nullState.enabled) return true
        if (textNormalizeState.enabled) {
          if (textNormalizeState.mode !== 'per-column') return true
          const textColumns = textNormalizeState.columns[sheetName] ?? {}
          if (Object.values(textColumns).some(config => config.enabled)) return true
        }
        if (numericCleanupState.enabled) {
          const numericColumns = numericCleanupState.columns[sheetName] ?? {}
          if (Object.values(numericColumns).some(config => config.enabled)) return true
        }
        if (dateState.enabled) {
          const dateColumns = dateState.columns[sheetName] ?? {}
          if (Object.values(dateColumns).some(config => config.enabled)) return true
        }
        if (findReplaceState.enabled) {
          const rules = findReplaceState.rulesBySheet[sheetName] ?? []
          if (rules.some(rule => rule.enabled)) return true
        }
        if (calculatedState.enabled) {
          const rules = calculatedState.rulesBySheet[sheetName] ?? []
          if (rules.some(rule => rule.enabled)) return true
        }
        if (dedupState.enabled) {
          const config = dedupState.configsBySheet[sheetName]
          if (config?.keyColumns.length) return true
        }
        if (lookupState.enabled) {
          const config = lookupState.configsBySheet[sheetName]
          if (
            config?.referenceSheet &&
            config.importColumns.some(index => index != null) &&
            config.joins.some(hasLookupJoinColumns)
          ) {
            return true
          }
        }
        return false
      }
      const getRowsForExport = (sheetName: string) => {
        const rows = rowsBySheet[sheetName]
        if (!rows) return null
        if (!sheetHasTransforms(sheetName)) {
          return cloneRows(originalRowsBySheet[sheetName] ?? rows)
        }
        return transformSheet({
          sheetName,
          rows,
          columnNames: columnNamesBySheet[sheetName] ?? [],
          allRowsBySheet: rowsBySheet,
          allColumnNames: columnNamesBySheet,
          headerState,
          headerOverrides,
          columnOrderState,
          dateState,
          textNormalizeState,
          numericCleanupState,
          calculatedState,
          nullState,
          findReplaceState,
          dedupState,
          lookupState,
          calculatedRuleErrors: calculatedBlockingErrorsBySheet[sheetName],
        }).rows
      }

      if (fileInfo.isXlsx) {
        const workbook = XLSX.utils.book_new()
        const orderedSelection = sheetOrder.filter(sheetName => selectedSheets.includes(sheetName))
        const availableTargets = orderedSelection.filter(sheetName => rowsBySheet[sheetName])
        if (!availableTargets.length) throw new Error('Unable to locate sheet data for export.')
        availableTargets.forEach((sheetName, index) => {
          const exportRows = getRowsForExport(sheetName)
          if (!exportRows) return
          const worksheet = XLSX.utils.aoa_to_sheet(exportRows)
          XLSX.utils.book_append_sheet(workbook, worksheet, formatSheetName(sheetName, index))
        })
        const wbArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
        const workbookName = ensureXlsxFilename(prefixed)
        triggerDownload(
          new Blob([wbArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
          workbookName,
        )
      } else {
        const selectedTargets = selectedSheets.length ? selectedSheets : [sheetOrder[0]]
        const availableTargets = selectedTargets.filter(sheetName => rowsBySheet[sheetName])
        if (!availableTargets.length) throw new Error('Unable to locate sheet data for export.')

        if (availableTargets.length > 1) {
          const zip = new JSZip()
          availableTargets.forEach((sheetName, index) => {
            const exportRows = getRowsForExport(sheetName)
            if (!exportRows) return
            const worksheet = XLSX.utils.aoa_to_sheet(exportRows)
            const csv = XLSX.utils.sheet_to_csv(worksheet)
            zip.file(`${formatSheetName(sheetName, index)}.csv`, csv)
          })
          const archive = await zip.generateAsync({ type: 'blob' })
          const baseName = prefixed.replace(/\.(csv|xlsx|xls)$/i, '') || 'dillons_data_cleaner'
          triggerDownload(archive, `${baseName}.zip`)
        } else {
          const targetSheet = availableTargets[0]
          const exportRows = getRowsForExport(targetSheet)
          if (!exportRows) throw new Error('Unable to locate sheet data for export.')
          const worksheet = XLSX.utils.aoa_to_sheet(exportRows)
          const csv = XLSX.utils.sheet_to_csv(worksheet)
          const csvName = /\.csv$/i.test(prefixed) ? prefixed : `${prefixed}.csv`
          triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), csvName)
        }
      }

      setStatusMessage('Cleaned file downloaded.')
      setErrorMessage(null)
    } catch (error) {
      console.error(error)
      setErrorMessage('Something went wrong while generating the download. Please try again.')
    }
  }, [
    fileInfo,
    hasRunTransformations,
    sheetOrder,
    selectedSheets,
    rowsBySheet,
    columnNamesBySheet,
    headerState,
    columnOrderState,
    dateState,
    textNormalizeState,
    numericCleanupState,
    calculatedState,
    nullState,
    findReplaceState,
    dedupState,
    lookupState,
    originalRowsBySheet,
    calculatedBlockingErrorsBySheet,
    hasBlockingCalculatedErrors,
    headerOverrides,
    isHeaderCleanupActiveForSheet,
  ])

  const lookupDisabledMessage = !fileInfo
    ? 'Upload a multi-sheet Excel workbook to enable lookups'
    : !fileInfo.isXlsx
      ? 'Lookups require Excel workbooks with multiple sheets'
      : sheetOrder.length <= 1
        ? 'Add another sheet to enable lookups'
        : ''
  const lookupDisabled = Boolean(lookupDisabledMessage)

  useEffect(() => {
    if (lookupDisabled && lookupState.enabled) {
      setLookupState(current => ({ ...current, enabled: false }))
    }
  }, [lookupDisabled, lookupState.enabled])

  useEffect(() => {
    if (headerState.scope !== 'some') return
    if (!sheetOrder.length) return
    setHeaderState(current => {
      const available = current.sheets.filter(sheet => sheetOrder.includes(sheet))
      const normalized = available.length ? available : [sheetOrder[0]]
      if (
        normalized.length === current.sheets.length &&
        normalized.every((sheet, index) => sheet === current.sheets[index])
      ) {
        return current
      }
      return { ...current, sheets: normalized }
    })
  }, [headerState.scope, headerState.sheets, sheetOrder])

  useEffect(() => {
    if (!calculatedState.enabled && showCalculatedErrors) {
      setShowCalculatedErrors(false)
    }
  }, [calculatedState.enabled, showCalculatedErrors])

  const sheetSummary = fileInfo ? `${selectedSheets.length} of ${sheetOrder.length} sheets selected` : 'No file loaded'
  const canRunTransformations = Boolean(fileInfo && selectedSheets.length)
  const canDownload = Boolean(fileInfo && hasRunTransformations)

  const columnCountForSheet = (sheetName: string) => {
    const rowWidth = rowsBySheet[sheetName]?.[0]?.length ?? 0
    const nameWidth = columnNamesBySheet[sheetName]?.length ?? 0
    return Math.max(rowWidth, nameWidth)
  }
  const getRawHeaderLabel = useCallback(
    (sheetName: string, columnIndex: number) => {
      const stored = columnNamesBySheet[sheetName]?.[columnIndex]
      const raw = stored ?? getDefaultHeaderLabel(sheetName, columnIndex)
      return raw?.trim().length ? raw : getDefaultHeaderLabel(sheetName, columnIndex)
    },
    [columnNamesBySheet, getDefaultHeaderLabel],
  )
  const getFormattedHeaderLabel = useCallback(
    (sheetName: string, columnIndex: number) => {
      const raw = getRawHeaderLabel(sheetName, columnIndex)
      const shouldFormat =
        headerState.enabled && (headerState.scope === 'all' || headerState.sheets.includes(sheetName))
      return shouldFormat ? applyHeaderFormatting(raw, headerState) : raw
    },
    [getRawHeaderLabel, headerState],
  )
  const getFormattedHeaderNamesForSheet = useCallback(
    (sheetName: string) => {
      const width = columnCountForSheet(sheetName)
      return getDefaultOrder(width).map(index => getFormattedHeaderLabel(sheetName, index))
    },
    [columnCountForSheet, getFormattedHeaderLabel],
  )
  const getNumericDefaultConfig = useCallback(
    (sheetName: string, columnIndex: number): NumericColumnConfig => {
      const detection = numericDetectionBySheet[sheetName]?.[columnIndex]
      return buildNumericConfigFromDetection(detection, false)
    },
    [numericDetectionBySheet],
  )

  const isStepEnabled = (stepId: WorkflowStepId) => {
    switch (stepId) {
      case 'headers':
        return headerState.enabled
      case 'column-order':
        return columnOrderState.enabled
      case 'dates':
        return dateState.enabled
      case 'text-normalize':
        return textNormalizeState.enabled
      case 'numeric':
        return numericCleanupState.enabled
      case 'nulls':
        return nullState.enabled
      case 'find-replace':
        return findReplaceState.enabled
      case 'calculated':
        return calculatedState.enabled
      case 'dedupe':
        return dedupState.enabled
      case 'lookup':
        return lookupState.enabled
      case 'run-download':
        return hasRunTransformations
      default:
        return false
    }
  }

  type ColumnCheckboxMultiSelectProps = {
    label?: string
    columns: string[]
    selected: number[]
    onChange: (next: number[]) => void
    showSelectControls?: boolean
    emptyMessage?: string
  }

  const ColumnCheckboxMultiSelect = ({
    label,
    columns,
    selected,
    onChange,
    showSelectControls = false,
    emptyMessage = 'No columns available.',
  }: ColumnCheckboxMultiSelectProps) => {
    const toggleColumn = (index: number) => {
      const exists = selected.includes(index)
      const next = exists ? selected.filter(value => value !== index) : [...selected, index]
      const normalized = [...next].sort((a, b) => a - b)
      onChange(normalized)
    }
    const handleSelectAll = () => {
      if (!columns.length) return
      onChange(columns.map((_, idx) => idx))
    }
    const handleClear = () => {
      if (!selected.length) return
      onChange([])
    }
    return (
      <div className="space-y-2 text-xs text-white/80">
        {label ? <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">{label}</p> : null}
        {showSelectControls ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.3em] text-white/40">
            <span>{selected.length ? `${selected.length} selected` : 'None selected'}</span>
            <div className="flex items-center gap-2 tracking-normal">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={!columns.length}
                className="text-white/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                Select all
              </button>
              <span className="text-white/20">•</span>
              <button
                type="button"
                onClick={handleClear}
                disabled={!selected.length}
                className="text-white/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                Clear
              </button>
            </div>
          </div>
        ) : null}
        <div className="rounded-2xl border border-white/15 bg-black/30">
          {columns.length ? (
            <ul className="max-h-48 divide-y divide-white/5 overflow-auto">
              {columns.map((name, index) => {
                const displayName = name?.length ? name : `Column ${index + 1}`
                const checked = selected.includes(index)
                return (
                  <li key={`column-picker-${label ?? 'columns'}-${index}`}>
                    <label
                      className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 transition ${
                        checked ? 'bg-blue-500/20 text-white' : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{displayName}</p>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Col {index + 1}</p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/40 bg-transparent text-blue-400 focus:ring-blue-400"
                        checked={checked}
                        onChange={() => toggleColumn(index)}
                      />
                    </label>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-3 py-4 text-xs text-white/60">{emptyMessage}</p>
          )}
        </div>
      </div>
    )
  }


  const handleColumnOrderToggle = (checked: boolean) => {
    setColumnOrderState(current => ({ ...current, enabled: checked }))
    if (checked && !columnOrderSheet && sheetOrder.length) {
      setColumnOrderSheet(sheetOrder[0])
      focusPreviewSheet(sheetOrder[0])
    }
    resetTransforms()
  }

  const handleFindReplaceToggle = (checked: boolean) => {
    setFindReplaceState(current => ({ ...current, enabled: checked }))
    if (checked && !findReplaceSheet && sheetOrder.length) {
      setFindReplaceSheet(sheetOrder[0])
    }
    resetTransforms()
  }

  const handleDateToggle = (checked: boolean) => {
    setDateState(current => ({ ...current, enabled: checked }))
    if (checked && !dateSheet && sheetOrder.length) {
      setDateSheet(sheetOrder[0])
    }
    resetTransforms()
  }

  const handleCalculatedToggle = (checked: boolean) => {
    setCalculatedState(current => ({ ...current, enabled: checked }))
    if (checked && !calculatedSheet && sheetOrder.length) {
      setCalculatedSheet(sheetOrder[0])
    }
    if (!checked) {
      setShowCalculatedErrors(false)
    }
    resetTransforms()
  }

  const handleTextNormalizeToggle = (checked: boolean) => {
    setTextNormalizeState(current => ({ ...current, enabled: checked }))
    if (checked && !textNormalizeSheet && sheetOrder.length) {
      setTextNormalizeSheet(sheetOrder[0])
    }
    resetTransforms()
  }

  const updateTextNormalizeColumn = (
    sheetName: string,
    columnIndex: number,
    partial: Partial<TextNormalizeColumnConfig>,
  ) => {
    setTextNormalizeState(current => {
      const existing = current.columns[sheetName]?.[columnIndex] ?? {
        enabled: false,
        caseMode: current.defaultCaseMode,
        trimEdges: current.defaultTrimEdges,
        collapseSpaces: current.defaultCollapseSpaces,
      }
      return {
        ...current,
        columns: {
          ...current.columns,
          [sheetName]: {
            ...(current.columns[sheetName] ?? {}),
            [columnIndex]: { ...existing, ...partial },
          },
        },
      }
    })
    resetTransforms()
  }

  const handleNumericToggle = (checked: boolean) => {
    setNumericCleanupState(current => ({ ...current, enabled: checked }))
    if (checked && !numericSheet && sheetOrder.length) {
      setNumericSheet(sheetOrder[0])
    }
    resetTransforms()
  }

  const updateNumericColumn = (sheetName: string, columnIndex: number, partial: Partial<NumericColumnConfig>) => {
    setNumericCleanupState(current => {
      const existing = current.columns[sheetName]?.[columnIndex] ?? getNumericDefaultConfig(sheetName, columnIndex)
      return {
        ...current,
        columns: {
          ...current.columns,
          [sheetName]: {
            ...(current.columns[sheetName] ?? {}),
            [columnIndex]: { ...existing, ...partial },
          },
        },
      }
    })
    resetTransforms()
  }

  const handleDedupToggle = (checked: boolean) => {
    setDedupState(current => ({ ...current, enabled: checked }))
    if (checked && !dedupSheet && sheetOrder.length) {
      setDedupSheet(sheetOrder[0])
    }
    resetTransforms()
  }

  const updateDedupConfig = (sheetName: string, partial: Partial<DedupConfig>) => {
    setDedupState(current => ({
      ...current,
      configsBySheet: {
        ...current.configsBySheet,
        [sheetName]: {
          keyColumns: current.configsBySheet[sheetName]?.keyColumns ?? [],
          keepStrategy: current.configsBySheet[sheetName]?.keepStrategy ?? 'first',
          numericStrategy: current.configsBySheet[sheetName]?.numericStrategy ?? 'keep',
          textStrategy: current.configsBySheet[sheetName]?.textStrategy ?? 'keep',
          ...partial,
        },
      },
    }))
    resetTransforms()
  }

  const handleLookupToggle = (checked: boolean) => {
    if (lookupDisabled) {
      setLookupState(current => ({ ...current, enabled: false }))
      return
    }
    setLookupState(current => ({ ...current, enabled: checked }))
    if (checked && !lookupSheet && sheetOrder.length) {
      setLookupSheet(sheetOrder[0])
    }
    resetTransforms()
  }

  const updateLookupConfig = (sheetName: string, partial: Partial<LookupConfig>) => {
    setLookupState(current => ({
      ...current,
      configsBySheet: {
        ...current.configsBySheet,
        [sheetName]: {
          referenceSheet: current.configsBySheet[sheetName]?.referenceSheet ?? null,
          prefix: current.configsBySheet[sheetName]?.prefix ?? 'Lookup',
          joins: current.configsBySheet[sheetName]?.joins ?? [],
          importColumns: current.configsBySheet[sheetName]?.importColumns ?? [],
          duplicateStrategy: current.configsBySheet[sheetName]?.duplicateStrategy ?? 'first',
          ...partial,
        },
      },
    }))
    resetTransforms()
  }

  const addLookupJoin = (sheetName: string) => {
    setLookupState(current => ({
      ...current,
      configsBySheet: {
        ...current.configsBySheet,
        [sheetName]: {
          referenceSheet: current.configsBySheet[sheetName]?.referenceSheet ?? null,
          prefix: current.configsBySheet[sheetName]?.prefix ?? 'Lookup',
          joins: [
            ...(current.configsBySheet[sheetName]?.joins ?? []),
            { id: `join-${Date.now()}`, sourceColumn: null, referenceColumn: null },
          ],
          importColumns: current.configsBySheet[sheetName]?.importColumns ?? [],
          duplicateStrategy: current.configsBySheet[sheetName]?.duplicateStrategy ?? 'first',
        },
      },
    }))
    resetTransforms()
  }

  const updateLookupJoin = (
    sheetName: string,
    joinId: string,
    partial: Partial<LookupJoinPair>,
  ) => {
    setLookupState(current => ({
      ...current,
      configsBySheet: {
        ...current.configsBySheet,
        [sheetName]: {
          referenceSheet: current.configsBySheet[sheetName]?.referenceSheet ?? null,
          prefix: current.configsBySheet[sheetName]?.prefix ?? 'Lookup',
          importColumns: current.configsBySheet[sheetName]?.importColumns ?? [],
          duplicateStrategy: current.configsBySheet[sheetName]?.duplicateStrategy ?? 'first',
          joins: (current.configsBySheet[sheetName]?.joins ?? []).map(join =>
            join.id === joinId ? { ...join, ...partial } : join,
          ),
        },
      },
    }))
    resetTransforms()
  }

  const removeLookupJoin = (sheetName: string, joinId: string) => {
    setLookupState(current => ({
      ...current,
      configsBySheet: {
        ...current.configsBySheet,
        [sheetName]: {
          referenceSheet: current.configsBySheet[sheetName]?.referenceSheet ?? null,
          prefix: current.configsBySheet[sheetName]?.prefix ?? 'Lookup',
          importColumns: current.configsBySheet[sheetName]?.importColumns ?? [],
          duplicateStrategy: current.configsBySheet[sheetName]?.duplicateStrategy ?? 'first',
          joins: (current.configsBySheet[sheetName]?.joins ?? []).filter(join => join.id !== joinId),
        },
      },
    }))
    resetTransforms()
  }

  const updateColumnOrder = (sheetName: string, nextOrder: number[], sortMode: ColumnSortMode = null) => {
    const width = columnCountForSheet(sheetName)
    const normalized = normalizeColumnOrder(nextOrder, width)
    setColumnOrderState(current => ({
      ...current,
      orders: {
        ...current.orders,
        [sheetName]: normalized,
      },
      sortModeBySheet: {
        ...current.sortModeBySheet,
        [sheetName]: sortMode,
      },
    }))
    resetTransforms()
  }

  const applyAlphabeticalOrder = (sheetName: string, direction: 'asc' | 'desc') => {
    const width = columnCountForSheet(sheetName)
    const baseOrder = getDefaultOrder(width)
    const formattedNames = baseOrder.map(index => getFormattedHeaderLabel(sheetName, index).toLowerCase())
    const sorted = [...baseOrder].sort((a, b) => {
      const left = formattedNames[a] ?? ''
      const right = formattedNames[b] ?? ''
      if (left === right) return 0
      return direction === 'asc' ? (left < right ? -1 : 1) : left < right ? 1 : -1
    })
    updateColumnOrder(sheetName, sorted, direction)
  }

  const applyOrderToAllSheets = (sourceSheet: string) => {
    const sourceWidth = columnCountForSheet(sourceSheet)
    const sourceNames = getDefaultOrder(sourceWidth).map(index => getFormattedHeaderLabel(sourceSheet, index))
    const sourceOrder = normalizeColumnOrder(columnOrderState.orders[sourceSheet], sourceWidth)
    const sourceSortMode = columnOrderState.sortModeBySheet[sourceSheet]
    if (!sourceOrder.length) return

    const normalizeName = (value: string) => value.trim().toLowerCase()
    const buildNameMap = (names: string[]) => {
      const map = new Map<string, number>()
      for (let index = 0; index < names.length; index += 1) {
        const normalized = normalizeName(names[index] ?? '')
        if (!normalized.length || map.has(normalized)) return null
        map.set(normalized, index)
      }
      return map
    }

    const updatedOrders: Record<string, number[]> = {}
    const updatedSortModes: Record<string, ColumnSortMode> = { ...columnOrderState.sortModeBySheet }

    if (sourceSortMode === 'asc' || sourceSortMode === 'desc') {
      sheetOrder.forEach(sheet => {
        const width = columnCountForSheet(sheet)
        const names = getDefaultOrder(width).map(index => getFormattedHeaderLabel(sheet, index))
        const baseOrder = getDefaultOrder(width)
        const sorted = [...baseOrder].sort((a, b) => {
          const left = (names[a] ?? '').toLowerCase()
          const right = (names[b] ?? '').toLowerCase()
          if (left === right) return 0
          return sourceSortMode === 'asc' ? (left < right ? -1 : 1) : left < right ? 1 : -1
        })
        updatedOrders[sheet] = sorted
        updatedSortModes[sheet] = sourceSortMode
      })
    } else if (sourceSortMode === 'reset') {
      sheetOrder.forEach(sheet => {
        const width = columnCountForSheet(sheet)
        updatedOrders[sheet] = getDefaultOrder(width)
        updatedSortModes[sheet] = 'reset'
      })
    } else {
      const sourceMap = buildNameMap(sourceNames)
      sheetOrder.forEach(sheet => {
        const width = columnCountForSheet(sheet)
        const names = getFormattedHeaderNamesForSheet(sheet)
        const existing = normalizeColumnOrder(columnOrderState.orders[sheet], width)
        if (!sourceMap || width !== sourceWidth) {
          updatedOrders[sheet] = existing
          return
        }
        const targetMap = buildNameMap(names)
        if (!targetMap) {
          updatedOrders[sheet] = existing
          return
        }
        const matchedOrder: number[] = []
        let canMatch = true
        sourceOrder.forEach(sourceIndex => {
          const sourceLabel = normalizeName(sourceNames[sourceIndex] ?? '')
          const targetIndex = targetMap.get(sourceLabel)
          if (targetIndex == null) {
            canMatch = false
          } else {
            matchedOrder.push(targetIndex)
          }
        })
        updatedOrders[sheet] = canMatch ? normalizeColumnOrder(matchedOrder, width) : existing
        if (canMatch) {
          updatedSortModes[sheet] = null
        }
      })
    }

    setColumnOrderState(current => ({
      ...current,
      orders: updatedOrders,
      sortModeBySheet: updatedSortModes,
    }))
    resetTransforms()
  }

  const addFindReplaceRule = (sheetName: string) => {
    const newRule: FindReplaceRule = {
      id: `rule-${Date.now()}`,
      scope: 'sheet',
      columns: [],
      matchMode: 'equals',
      caseSensitive: false,
      find: '',
      replace: '',
      enabled: true,
      regexError: null,
    }
    setFindReplaceState(current => ({
      ...current,
      rulesBySheet: {
        ...current.rulesBySheet,
        [sheetName]: [
          ...(current.rulesBySheet[sheetName] ?? []),
          newRule,
        ],
      },
    }))
    setActiveFindReplaceRuleId(newRule.id)
  }

  const updateFindReplaceRule = (sheetName: string, ruleId: string, partial: Partial<FindReplaceRule>) => {
    setFindReplaceState(current => ({
      ...current,
      rulesBySheet: {
        ...current.rulesBySheet,
        [sheetName]: (current.rulesBySheet[sheetName] ?? []).map(rule => {
          if (rule.id !== ruleId) return rule
          const nextRule = { ...rule, ...partial }
          nextRule.regexError = getFindReplaceRegexError(nextRule)
          return nextRule
        }),
      },
    }))
    resetTransforms()
  }

  const removeFindReplaceRule = (sheetName: string, ruleId: string) => {
    setFindReplaceState(current => ({
      ...current,
      rulesBySheet: {
        ...current.rulesBySheet,
        [sheetName]: (current.rulesBySheet[sheetName] ?? []).filter(rule => rule.id !== ruleId),
      },
    }))
    setActiveFindReplaceRuleId(current => (current === ruleId ? null : current))
    resetTransforms()
  }

  const updateDateColumn = (sheetName: string, columnIndex: number, partial: Partial<DateColumnConfig>) => {
    setDateState(current => ({
      ...current,
      columns: {
        ...current.columns,
        [sheetName]: {
          ...(current.columns[sheetName] ?? {}),
          [columnIndex]: {
            enabled: current.columns[sheetName]?.[columnIndex]?.enabled ?? false,
            format: current.columns[sheetName]?.[columnIndex]?.format ?? current.defaultFormat,
            confidence: current.columns[sheetName]?.[columnIndex]?.confidence ?? 0,
            sampleCount: current.columns[sheetName]?.[columnIndex]?.sampleCount ?? 0,
            guardReason: current.columns[sheetName]?.[columnIndex]?.guardReason ?? null,
            ...partial,
          },
        },
      },
    }))
    resetTransforms()
  }

  const addCalculatedRule = (sheetName: string) => {
    setCalculatedState(current => ({
      ...current,
      rulesBySheet: {
        ...current.rulesBySheet,
        [sheetName]: [
          ...(current.rulesBySheet[sheetName] ?? []),
          {
            id: `calc-${Date.now()}`,
            label: 'New field',
            type: 'add',
            sources: [],
            delimiter: '',
            enabled: true,
          },
        ],
      },
    }))
  }

  const updateCalculatedRule = (sheetName: string, ruleId: string, partial: Partial<CalculatedRule>) => {
    setCalculatedState(current => ({
      ...current,
      rulesBySheet: {
        ...current.rulesBySheet,
        [sheetName]: (current.rulesBySheet[sheetName] ?? []).map(rule =>
          rule.id === ruleId ? { ...rule, ...partial } : rule,
        ),
      },
    }))
    resetTransforms()
  }

  const removeCalculatedRule = (sheetName: string, ruleId: string) => {
    setCalculatedState(current => ({
      ...current,
      rulesBySheet: {
        ...current.rulesBySheet,
        [sheetName]: (current.rulesBySheet[sheetName] ?? []).filter(rule => rule.id !== ruleId),
      },
    }))
    resetTransforms()
  }

  const handleColumnDragStart = (sheetName: string, index: number) => {
    setDragColumn({ sheet: sheetName, index })
  }

  const handleColumnDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  const handleColumnDrop = (sheetName: string, targetIndex: number) => {
    if (!dragColumn || dragColumn.sheet !== sheetName) return
    const width = columnCountForSheet(sheetName)
    const order = [...normalizeColumnOrder(columnOrderState.orders[sheetName], width)]
    const [removed] = order.splice(dragColumn.index, 1)
    order.splice(targetIndex, 0, removed)
    updateColumnOrder(sheetName, order, null)
    setDragColumn(null)
  }

  const columnOrderTabs = sheetOrder.length ? sheetOrder : columnOrderSheet ? [columnOrderSheet] : []
  const findReplaceTabs = sheetOrder.length ? sheetOrder : findReplaceSheet ? [findReplaceSheet] : []
  const dateTabs = sheetOrder.length ? sheetOrder : dateSheet ? [dateSheet] : []
  const calculatedTabs = sheetOrder.length ? sheetOrder : calculatedSheet ? [calculatedSheet] : []
  const textNormalizeTabs = sheetOrder.length ? sheetOrder : textNormalizeSheet ? [textNormalizeSheet] : []
  const numericTabs = sheetOrder.length ? sheetOrder : numericSheet ? [numericSheet] : []
  const dedupTabs = sheetOrder.length ? sheetOrder : dedupSheet ? [dedupSheet] : []
  const lookupTabs = sheetOrder.length ? sheetOrder : lookupSheet ? [lookupSheet] : []

  const renderColumnList = (sheetName: string) => {
    const order = normalizeColumnOrder(columnOrderState.orders[sheetName], columnCountForSheet(sheetName))
    return (
      <ul className="mt-4 max-h-96 space-y-2 overflow-auto text-xs text-white/80">
        {order.map((columnIndex, position) => (
          <li key={`${sheetName}-${columnIndex}`}>
            <button
              type="button"
              draggable
              onDragStart={() => handleColumnDragStart(sheetName, position)}
              onDragOver={handleColumnDragOver}
              onDrop={() => handleColumnDrop(sheetName, position)}
              className="flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left"
            >
              <span className="flex items-center gap-2">
                <span className="text-white/60">≡</span>
                {getFormattedHeaderLabel(sheetName, columnIndex)}
              </span>
              <span className="text-white/40">{columnIndex + 1}</span>
            </button>
          </li>
        ))}
      </ul>
    )
  }

  const renderFindReplaceRules = (sheetName: string) => {
    const rules = findReplaceState.rulesBySheet[sheetName] ?? []
    const names = getFormattedHeaderNamesForSheet(sheetName)
    const allowWorkbookScope = selectedSheets.length > 1
    const hasInvalidRegex = rules.some(rule => Boolean(rule.regexError))
    return (
      <div className="space-y-4">
        {rules.length === 0 ? <p className="text-xs text-white/60">No rules yet. Add one to get started.</p> : null}
        {hasInvalidRegex ? (
          <div className="rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-2 text-xs text-red-200">
            Fix invalid regex patterns to apply replacements.
          </div>
        ) : null}
        {rules.map(rule => (
          <div
            key={rule.id}
            className={`rounded-2xl border p-4 text-xs text-white/80 transition ${
              rule.regexError
                ? 'border-red-500/60 bg-red-500/5'
                : activeFindReplaceRuleId === rule.id
                  ? 'border-blue-400/70 bg-blue-500/5 shadow-[0_0_20px_rgba(96,165,250,0.2)]'
                  : 'border-white/15 bg-white/5'
            }`}
            onFocusCapture={() => setActiveFindReplaceRuleId(rule.id)}
            onMouseDown={() => setActiveFindReplaceRuleId(rule.id)}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                  checked={rule.enabled}
                  onChange={event => updateFindReplaceRule(sheetName, rule.id, { enabled: event.target.checked })}
                />
                Enabled
              </label>
              <button
                type="button"
                onClick={() => removeFindReplaceRule(sheetName, rule.id)}
                className="text-white/60 hover:text-white"
              >
                Remove
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                Scope
                <select
                  value={rule.scope}
                  onChange={event =>
                    updateFindReplaceRule(sheetName, rule.id, { scope: event.target.value as FindReplaceRule['scope'] })
                  }
                  className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                >
                  <option value="sheet">Entire sheet</option>
                  <option value="columns">Specific columns</option>
                  {allowWorkbookScope || rule.scope === 'workbook' ? (
                    <option value="workbook">All selected sheets</option>
                  ) : null}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Match mode
                <select
                  value={rule.matchMode}
                  onChange={event => updateFindReplaceRule(sheetName, rule.id, { matchMode: event.target.value as FindReplaceMatchMode })}
                  className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                >
                  <option value="equals">Cell equals value</option>
                  <option value="contains">Cell contains value</option>
                  <option value="regex">Regex</option>
                </select>
              </label>
            </div>
            {rule.scope === 'columns' ? (
              <div className="mt-3">
                <ColumnCheckboxMultiSelect
                  label="Columns (click to toggle)"
                  columns={names}
                  selected={rule.columns}
                  onChange={selected => updateFindReplaceRule(sheetName, rule.id, { columns: selected })}
                  emptyMessage="No columns detected."
                />
              </div>
            ) : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                Find
                <input
                  type="text"
                  value={rule.find}
                  onChange={event => updateFindReplaceRule(sheetName, rule.id, { find: event.target.value })}
                  className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1">
                Replace with
                <input
                  type="text"
                  value={rule.replace}
                  onChange={event => updateFindReplaceRule(sheetName, rule.id, { replace: event.target.value })}
                  className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                />
              </label>
            </div>
            {rule.regexError ? (
              <p className="mt-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">
                {rule.regexError}
              </p>
            ) : null}
            <label className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                checked={rule.caseSensitive}
                onChange={event => updateFindReplaceRule(sheetName, rule.id, { caseSensitive: event.target.checked })}
              />
              Case sensitive
            </label>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addFindReplaceRule(sheetName)}
          className="w-full rounded-2xl border border-dashed border-white/20 px-4 py-3 text-xs font-semibold text-white/70 hover:border-white/40"
        >
          + Add rule
        </button>
      </div>
    )
  }

  const renderDateColumnList = (sheetName: string) => {
    const names = getFormattedHeaderNamesForSheet(sheetName)
    const configs = dateState.columns[sheetName] ?? {}
    return (
      <div className="mt-4 space-y-3">
        {names.length === 0 ? <p className="text-xs text-white/60">No headers detected.</p> : null}
        {names.map((name, index) => {
          const config =
            configs[index] ?? { enabled: false, format: dateState.defaultFormat, confidence: 0, sampleCount: 0, guardReason: null }
          const displayMode = dateState.mode
          const checkboxDisabled = displayMode === 'global'
          const enabled = config.enabled
          const statusLabel = enabled ? 'Converted' : 'Off'
          const statusClasses = enabled
            ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
            : 'border-white/20 text-white/60'
          const confidencePercent = Math.round((config.confidence ?? 0) * 100)
          const toggleDisabled = checkboxDisabled
          return (
            <div key={`${sheetName}-date-${index}`} className="rounded-2xl border border-white/15 bg-white/5 p-4 text-xs text-white/80">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{name}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-white/50">Samples: {getDateSamples(rowsBySheet[sheetName] ?? [], index).join(', ') || '—'}</p>
                  <p className="text-white/40 text-[11px]">
                    Confidence: {Number.isFinite(confidencePercent) ? confidencePercent : 0}% · {config.sampleCount} samples
                  </p>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                    checked={enabled}
                    disabled={toggleDisabled}
                    onChange={event => updateDateColumn(sheetName, index, { enabled: event.target.checked })}
                  />
                  Treat as date
                </label>
              </div>
              {((dateState.mode === 'per-column' && config.enabled) || dateState.mode === 'global') ? (
                <label className="mt-3 flex flex-col gap-1 text-white/70">
                  Format
                  <select
                    value={config.format}
                    onChange={event => updateDateColumn(sheetName, index, { format: event.target.value })}
                    className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                  >
                    {[dateState.defaultFormat, ...DATE_FORMAT_OPTIONS]
                      .filter((format, idx, array) => array.indexOf(format) === idx)
                      .map(format => (
                        <option key={`${sheetName}-${index}-${format}`} value={format}>
                          {format}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }

  const renderTextNormalizeColumnList = (sheetName: string) => {
    const names = getFormattedHeaderNamesForSheet(sheetName)
    const configs = textNormalizeState.columns[sheetName] ?? {}
    return (
      <div className="mt-4 space-y-3">
        {names.map((name, index) => {
          const config = configs[index] ?? {
            enabled: false,
            caseMode: textNormalizeState.defaultCaseMode,
            trimEdges: textNormalizeState.defaultTrimEdges,
            collapseSpaces: textNormalizeState.defaultCollapseSpaces,
          }
          return (
            <div key={`${sheetName}-text-${index}`} className="rounded-2xl border border-white/15 bg-white/5 p-4 text-xs text-white/80">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{name}</p>
                  <p className="text-white/50">
                    Samples: {collectSampleValues(rowsBySheet[sheetName] ?? [], index).join(', ') || '—'}
                  </p>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                    checked={config.enabled}
                    onChange={event => updateTextNormalizeColumn(sheetName, index, { enabled: event.target.checked })}
                  />
                  Normalize
                </label>
              </div>
              {config.enabled ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    Target case
                    <select
                      value={config.caseMode}
                      onChange={event => updateTextNormalizeColumn(sheetName, index, { caseMode: event.target.value as TextCaseMode })}
                      className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                    >
                      {(['lower', 'upper', 'proper', 'preserve'] as TextCaseMode[]).map(mode => (
                        <option key={`${sheetName}-${index}-${mode}`} value={mode}>
                          {TEXT_CASE_LABELS[mode]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                      checked={config.trimEdges}
                      onChange={event => updateTextNormalizeColumn(sheetName, index, { trimEdges: event.target.checked })}
                    />
                    Trim edges
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                      checked={config.collapseSpaces}
                      onChange={event => updateTextNormalizeColumn(sheetName, index, { collapseSpaces: event.target.checked })}
                    />
                    Collapse spaces
                  </label>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }

  const renderTextNormalizeModeControls = () => (
    <div className="mt-4 grid gap-3 text-xs text-white/80 sm:grid-cols-3">
      <label className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2">
        <input
          type="radio"
          name="text-normalize-mode"
          value="global"
          checked={textNormalizeState.mode === 'global'}
          onChange={() => {
            setTextNormalizeState(current => ({ ...current, mode: 'global' }))
            resetTransforms()
          }}
          className="h-4 w-4 text-blue-400 focus:ring-blue-400"
        />
        Global — apply defaults to every cell
      </label>
      <label className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2">
        <input
          type="radio"
          name="text-normalize-mode"
          value="global-with-overrides"
          checked={textNormalizeState.mode === 'global-with-overrides'}
          onChange={() => {
            setTextNormalizeState(current => ({ ...current, mode: 'global-with-overrides' }))
            if (!textNormalizeSheet && sheetOrder.length) {
              setTextNormalizeSheet(sheetOrder[0])
            }
            resetTransforms()
          }}
          className="h-4 w-4 text-blue-400 focus:ring-blue-400"
        />
        Global + overrides — defaults everywhere, customize select columns
      </label>
      <label className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2">
        <input
          type="radio"
          name="text-normalize-mode"
          value="per-column"
          checked={textNormalizeState.mode === 'per-column'}
          onChange={() => {
            setTextNormalizeState(current => ({ ...current, mode: 'per-column' }))
            if (!textNormalizeSheet && sheetOrder.length) {
              setTextNormalizeSheet(sheetOrder[0])
            }
            resetTransforms()
          }}
          className="h-4 w-4 text-blue-400 focus:ring-blue-400"
        />
        Per column — hand pick columns & options
      </label>
    </div>
  )

  const renderTextNormalizeGlobalControls = () => (
    <div className="mt-4 space-y-3 text-xs text-white/80">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          Target case
          <select
            value={textNormalizeState.defaultCaseMode}
            onChange={event => {
              const mode = event.target.value as TextCaseMode
              setTextNormalizeState(current => ({ ...current, defaultCaseMode: mode }))
              resetTransforms()
            }}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
          >
            {(['lower', 'upper', 'proper', 'preserve'] as TextCaseMode[]).map(mode => (
              <option key={`global-case-${mode}`} value={mode}>
                {TEXT_CASE_LABELS[mode]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
            checked={textNormalizeState.defaultTrimEdges}
            onChange={event => {
              setTextNormalizeState(current => ({ ...current, defaultTrimEdges: event.target.checked }))
              resetTransforms()
            }}
          />
          Trim edges
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
            checked={textNormalizeState.defaultCollapseSpaces}
            onChange={event => {
              setTextNormalizeState(current => ({ ...current, defaultCollapseSpaces: event.target.checked }))
              resetTransforms()
            }}
          />
          Collapse internal spaces
        </label>
      </div>
      <p className="text-white/50">
        Applies before other string transforms so calculated fields and lookups inherit the cleaned values.
      </p>
    </div>
  )

  const renderNumericColumnList = (sheetName: string) => {
    const names = getFormattedHeaderNamesForSheet(sheetName)
    const configs = numericCleanupState.columns[sheetName] ?? {}
    const detection = numericDetectionBySheet[sheetName] ?? {}
    const sheetPercentWarnings = numericWarningsBySheet[sheetName]?.percentOverflow ?? {}
    const numericColumns = names.map((name, index) => {
      const info = detection[index]
      return { name, index, detected: Boolean(info?.isNumeric), kind: info?.kind ?? 'unknown', precision: info?.precision }
    })
    const hasDetectedColumns = numericColumns.some(column => column.detected)

    return (
      <div className="mt-4 space-y-3">
        {numericColumns.length === 0 ? (
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-xs text-white/60">
            No columns found on this sheet.
          </div>
        ) : hasDetectedColumns ? (
          <p className="text-xs text-white/60">Columns marked "Auto" were detected as numeric-like.</p>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-xs text-white/60">
            No columns were auto-detected; you can still enable cleanup manually.
          </div>
        )}
        {numericColumns.map(({ name, index, detected, kind, precision }) => {
          const config = configs[index] ?? getNumericDefaultConfig(sheetName, index)
          const overflowCount = sheetPercentWarnings[index] ?? 0
          return (
            <div key={`${sheetName}-numeric-${index}`} className="rounded-2xl border border-white/15 bg-white/5 p-4 text-xs text-white/80">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{name}</p>
                    {detected ? (
                      <span className="rounded-full border border-emerald-400/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200/80">
                        Auto · {kind === 'mixed' ? 'Mixed' : kind === 'unknown' ? 'Numeric' : kind}
                      </span>
                    ) : null}
                  </div>
                  {detected && kind === 'float' && precision != null ? (
                    <p className="text-white/50">Detected precision: {precision}</p>
                  ) : null}
                  <p className="text-white/50">
                    Samples: {collectSampleValues(rowsBySheet[sheetName] ?? [], index).join(', ') || '—'}
                  </p>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                    checked={config.enabled}
                    onChange={event => updateNumericColumn(sheetName, index, { enabled: event.target.checked })}
                  />
                  Clean numeric
                </label>
              </div>
              {config.enabled ? (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <label className="flex flex-col gap-1">
                      Format
                      <select
                        value={config.format}
                        onChange={event => updateNumericColumn(sheetName, index, { format: event.target.value as NumericFormatMode })}
                        className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                      >
                        {NUMERIC_FORMAT_OPTIONS.map(option => (
                          <option key={`${sheetName}-${index}-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      Precision
                      <select
                        value={config.precision}
                        onChange={event =>
                          updateNumericColumn(sheetName, index, {
                            precision: (event.target.value === 'auto' ? 'auto' : Number(event.target.value)) as NumericPrecision,
                          })
                        }
                        className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                      >
                        {NUMERIC_PRECISION_OPTIONS.map(option => (
                          <option key={`${sheetName}-${index}-${option}`} value={option}>
                            {option === 'auto' ? 'Auto' : `${option} decimals`}
                          </option>
                        ))}
                      </select>
                    </label>
                    {config.format === 'currency' ? (
                      <label className="flex flex-col gap-1">
                        Currency symbol
                        <select
                          value={config.currency}
                          onChange={event => updateNumericColumn(sheetName, index, { currency: event.target.value as NumericColumnConfig['currency'] })}
                          className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                        >
                          {CURRENCY_OPTIONS.map(option => (
                            <option key={`${sheetName}-${index}-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <div />
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-white/70">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                      checked={config.stripSymbols}
                      onChange={event => updateNumericColumn(sheetName, index, { stripSymbols: event.target.checked })}
                    />
                    Strip $, commas, spaces before parsing
                  </label>
                  {config.format === 'percent' ? (
                    <div className="space-y-2">
                      <div className="rounded-2xl border border-blue-400/30 bg-blue-500/5 px-3 py-2 text-[11px] text-white/70">
                        <p className="font-semibold text-white">Percent interpretation</p>
                        <ul className="mt-1 space-y-1 text-white/60">
                          <li>
                            <code className="text-white">12%</code> → 12 percent
                          </li>
                          <li>
                            <code className="text-white">0.125</code> → 12.5 percent
                          </li>
                          <li>
                            <code className="text-white">12</code> → 12 percent
                          </li>
                          <li>
                            <code className="text-white">&gt;100</code> → left unchanged + flagged
                          </li>
                        </ul>
                      </div>
                      {overflowCount > 0 ? (
                        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                          {overflowCount.toLocaleString()} value{overflowCount === 1 ? '' : 's'} above 100% stayed untouched in the preview.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }
  const renderDedupConfig = (sheetName: string) => {
    const config = dedupState.configsBySheet[sheetName] ?? {
      keyColumns: [],
      keepStrategy: 'first',
      numericStrategy: 'keep',
      textStrategy: 'keep',
    }
    const names = getFormattedHeaderNamesForSheet(sheetName)
    return (
      <div className="space-y-4 text-xs text-white/80">
        <ColumnCheckboxMultiSelect
          label="Key columns"
          columns={names}
          selected={config.keyColumns}
          onChange={selected => updateDedupConfig(sheetName, { keyColumns: selected })}
          showSelectControls
          emptyMessage="Add headers to select keys."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            Keep strategy
            <select
              value={config.keepStrategy}
              onChange={event => updateDedupConfig(sheetName, { keepStrategy: event.target.value as DedupKeepStrategy })}
              className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
            >
              <option value="first">Keep first</option>
              <option value="last">Keep last</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Numeric conflicts
            <select
              value={config.numericStrategy}
              onChange={event => updateDedupConfig(sheetName, { numericStrategy: event.target.value as DedupNumericStrategy })}
              className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
            >
              <option value="keep">Keep existing</option>
              <option value="sum">Sum values</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Text conflicts
            <select
              value={config.textStrategy}
              onChange={event => updateDedupConfig(sheetName, { textStrategy: event.target.value as DedupTextStrategy })}
              className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
            >
              <option value="keep">Keep existing</option>
              <option value="concat">Concatenate</option>
            </select>
          </label>
        </div>
      </div>
    )
  }

  const renderLookupConfig = (sheetName: string) => {
    const config = lookupState.configsBySheet[sheetName] ?? {
      referenceSheet: null,
      prefix: 'Lookup',
      joins: [],
      importColumns: [],
      duplicateStrategy: 'first',
    }
    const names = getFormattedHeaderNamesForSheet(sheetName)
    const referenceNames = config.referenceSheet ? columnNamesBySheet[config.referenceSheet] ?? [] : []
    const diagnostics = lookupDiagnosticsBySheet[sheetName]
    return (
      <div className="space-y-4 text-xs text-white/80">
        <label className="flex flex-col gap-1">
          Reference sheet (add lookup sheets to your workbook)
          <select
            value={config.referenceSheet ?? ''}
            onChange={event => updateLookupConfig(sheetName, { referenceSheet: event.target.value || null })}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
          >
            <option value="">Choose sheet</option>
            {sheetOrder.filter(name => name !== sheetName).map(name => (
              <option key={`${sheetName}-lookup-${name}`} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Column prefix
          <input
            type="text"
            value={config.prefix}
            onChange={event => updateLookupConfig(sheetName, { prefix: event.target.value })}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Duplicate reference keys
          <select
            value={config.duplicateStrategy}
            onChange={event =>
              updateLookupConfig(sheetName, { duplicateStrategy: event.target.value as LookupDuplicateStrategy })
            }
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
          >
            <option value="first">Keep first match</option>
            <option value="last">Keep last match</option>
            <option value="abort">Abort lookup</option>
          </select>
        </label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Join keys</p>
            <button
              type="button"
              onClick={() => addLookupJoin(sheetName)}
              className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/70 hover:border-white/40"
            >
              + Add pair
            </button>
          </div>
          {config.joins.length === 0 ? <p className="text-xs text-white/60">No key pairs yet.</p> : null}
          {config.joins.map(pair => (
            <div key={pair.id} className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                Source column
                <select
                  value={pair.sourceColumn == null ? '' : pair.sourceColumn}
                  onChange={event =>
                    updateLookupJoin(sheetName, pair.id, {
                      sourceColumn: event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                  className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                >
                  <option value="">Choose column</option>
                  {names.map((name, index) => {
                    const displayName = name?.length ? name : `Column ${index + 1}`
                    return (
                      <option key={`${sheetName}-lookup-source-${displayName}-${index}`} value={index}>
                        {displayName} (Col {index + 1})
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Reference column
                <select
                  value={pair.referenceColumn == null ? '' : pair.referenceColumn}
                  onChange={event =>
                    updateLookupJoin(sheetName, pair.id, {
                      referenceColumn: event.target.value === '' ? null : Number(event.target.value),
                    })
                  }
                  className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                >
                  <option value="">Choose column</option>
                  {referenceNames.map((name, index) => {
                    const displayName = name?.length ? name : `Column ${index + 1}`
                    return (
                      <option key={`${sheetName}-lookup-ref-${displayName}-${index}`} value={index}>
                        {displayName} (Col {index + 1})
                      </option>
                    )
                  })}
                </select>
              </label>
              <button
                type="button"
                onClick={() => removeLookupJoin(sheetName, pair.id)}
                className="text-left text-white/60 hover:text-white"
              >
                Remove pair
              </button>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <ColumnCheckboxMultiSelect
            label="Columns to pull in"
            columns={referenceNames}
            selected={config.importColumns}
            onChange={selected => updateLookupConfig(sheetName, { importColumns: selected })}
            showSelectControls
            emptyMessage="Choose a reference sheet to pick columns."
          />
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">
            Selected {config.importColumns.length} column{config.importColumns.length === 1 ? '' : 's'}
          </p>
        </div>
        {diagnostics ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-[11px] ${
              diagnostics.aborted ? 'border-red-500/50 bg-red-500/10 text-red-200' : 'border-white/15 bg-white/5 text-white/70'
            }`}
          >
            <p>Rows matched: {diagnostics.matchedRows.toLocaleString()}</p>
            <p>Rows unmatched: {diagnostics.unmatchedRows.toLocaleString()}</p>
            <p>
              Duplicate reference keys: {diagnostics.duplicateKeys.toLocaleString()} · Strategy:{' '}
              {diagnostics.strategy === 'first' ? 'Keep first' : diagnostics.strategy === 'last' ? 'Keep last' : 'Abort lookup'}
            </p>
            {diagnostics.aborted ? (
              <p className="mt-2 font-semibold">
                Lookup skipped because duplicates exist and the current strategy is Abort.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  const renderCalculatedRules = (sheetName: string) => {
    const rules = calculatedState.rulesBySheet[sheetName] ?? []
    const names = getFormattedHeaderNamesForSheet(sheetName)
    const ruleErrors = calculatedInlineErrorsBySheet[sheetName] ?? {}
    const hasErrors = calculatedState.enabled && Object.values(ruleErrors).some(Boolean)
    const columnCount = names.length
    return (
      <div className="space-y-4">
        {rules.length === 0 ? <p className="text-xs text-white/60">No calculated fields yet. Add one to get started.</p> : null}
        {hasErrors ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
            Fix invalid calculated fields before running or exporting.
          </div>
        ) : null}
        {rules.map(rule => {
          const inlineError = ruleErrors[rule.id] ?? null
          const validSourceCount = new Set(
            rule.sources.filter(index => index != null && index >= 0 && index < columnCount),
          ).size
          const needsMoreSources = rule.enabled && validSourceCount < 2
          return (
            <div
              key={rule.id}
              className={`rounded-2xl border p-4 text-xs text-white/80 ${
                inlineError ? 'border-red-500/60 bg-red-500/5' : 'border-white/15 bg-white/5'
              }`}
            >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                  checked={rule.enabled}
                  onChange={event => updateCalculatedRule(sheetName, rule.id, { enabled: event.target.checked })}
                />
                Enabled
              </label>
              <button
                type="button"
                onClick={() => removeCalculatedRule(sheetName, rule.id)}
                className="text-white/60 hover:text-white"
              >
                Remove
              </button>
            </div>
            <label className="mt-3 flex flex-col gap-1">
              Field name
              <input
                type="text"
                value={rule.label}
                onChange={event => updateCalculatedRule(sheetName, rule.id, { label: event.target.value })}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                Operation
                <select
                  value={rule.type}
                  onChange={event => updateCalculatedRule(sheetName, rule.id, { type: event.target.value as CalculatedOperation })}
                  className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                >
                  {CALCULATED_OPERATIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {rule.type === 'concat' ? (
                <label className="flex flex-col gap-1">
                  Delimiter
                  <input
                    type="text"
                    value={rule.delimiter}
                    onChange={event => updateCalculatedRule(sheetName, rule.id, { delimiter: event.target.value })}
                    className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                  />
                </label>
              ) : (
                <div />
              )}
            </div>
            <div className="mt-3">
              <ColumnCheckboxMultiSelect
                label="Source columns"
                columns={names}
                selected={rule.sources}
                onChange={selected => updateCalculatedRule(sheetName, rule.id, { sources: selected })}
                emptyMessage="Add columns to this sheet to build new fields."
              />
            </div>
            {needsMoreSources && !inlineError ? (
              <p className="mt-2 text-[11px] text-white/50">Select at least two columns to activate this field.</p>
            ) : null}
            {inlineError ? (
              <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                {inlineError}
              </div>
            ) : null}
          </div>
        )})}
        <button
          type="button"
          onClick={() => addCalculatedRule(sheetName)}
          className="w-full rounded-2xl border border-dashed border-white/20 px-4 py-3 text-xs font-semibold text-white/70 hover:border-white/40"
        >
          + Add calculated field
        </button>
      </div>
    )
  }

  const renderDateModeControls = () => (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs text-white/80">
      <label className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2">
        <input
          type="radio"
          name="date-mode"
          value="global"
          checked={dateState.mode === 'global'}
          onChange={() => {
            setDateState(current => ({ ...current, mode: 'global' }))
            resetTransforms()
          }}
          className="h-4 w-4 text-blue-400 focus:ring-blue-400"
        />
        Global — find all dates and format as {dateState.defaultFormat}
      </label>
      <label className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2">
        <input
          type="radio"
          name="date-mode"
          value="per-column"
          checked={dateState.mode === 'per-column'}
          onChange={() => {
            setDateState(current => ({ ...current, mode: 'per-column' }))
            resetTransforms()
          }}
          className="h-4 w-4 text-blue-400 focus:ring-blue-400"
        />
        Per column — hand pick columns and formats
      </label>
    </div>
  )

  const renderDateDefaultSelect = () => (
    <label className="mt-4 flex flex-col gap-1 text-xs text-white/60">
      Default format
      <select
        value={dateState.defaultFormat}
        onChange={event => {
          const nextFormat = event.target.value
          setDateState(current => ({ ...current, defaultFormat: nextFormat }))
          resetTransforms()
        }}
        className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
      >
        {DATE_FORMAT_OPTIONS.map(format => (
          <option key={`default-${format}`} value={format}>
            {format}
          </option>
        ))}
      </select>
    </label>
  )

  function getDateSamples(rows: CellValue[][], columnIndex: number) {
    const samples: string[] = []
    if (!rows.length) return samples
    for (let i = 1; i < rows.length; i += 1) {
      const value = rows[i][columnIndex]
      if (value === '' || value === null || value === undefined) continue
      samples.push(String(value))
      if (samples.length >= 3) break
    }
    return samples
  }

  const isStepDisabled = (stepId: WorkflowStepId) => stepId === 'lookup' && lookupDisabled
  const activeStepMeta = WORKFLOW_STEPS.find(step => step.id === activeStep) ?? WORKFLOW_STEPS[0]
  const activeStepSummary = getPreviewSummaryForStep(activeStep, activePreview)
  const activeStepIndex = WORKFLOW_STEP_ORDER.indexOf(activeStep)

  const findNavigableStep = (startIndex: number, direction: 1 | -1): WorkflowStepId | null => {
    let pointer = startIndex
    while (pointer >= 0 && pointer < WORKFLOW_STEP_ORDER.length) {
      const candidate = WORKFLOW_STEP_ORDER[pointer]
      if (!isStepDisabled(candidate)) return candidate
      pointer += direction
    }
    return null
  }

  const previousStepId = findNavigableStep(activeStepIndex - 1, -1)
  const nextStepId = findNavigableStep(activeStepIndex + 1, 1)

  const getStepStatus = (stepId: WorkflowStepId) => {
    const index = WORKFLOW_STEP_ORDER.indexOf(stepId)
    if (index < activeStepIndex) return 'past'
    if (index === activeStepIndex) return 'current'
    return 'future'
  }

  const goToStep = (stepId: WorkflowStepId) => {
    if (isStepDisabled(stepId)) return
    setActiveStep(stepId)
  }

  const goToNextStep = () => {
    if (nextStepId) setActiveStep(nextStepId)
  }

  const goToPreviousStep = () => {
    if (previousStepId) setActiveStep(previousStepId)
  }

  const runStepMeta = WORKFLOW_STEPS.find(step => step.id === 'run-download')
  const baseStepperSteps = WORKFLOW_STEPS.filter(
    step => !ADVANCED_STEP_IDS.includes(step.id) && step.id !== 'run-download',
  )
  const advancedStepperSteps = WORKFLOW_STEPS.filter(step => ADVANCED_STEP_IDS.includes(step.id))
  const advancedGroupNumber = baseStepperSteps.length + 1

  const renderStepTrigger = (step: WorkflowStepMeta, options?: { labelOverride?: string }) => {
    const status = getStepStatus(step.id)
    const disabled = isStepDisabled(step.id)
    const stepNumber = WORKFLOW_STEP_ORDER.indexOf(step.id) + 1
    const displayLabel = options?.labelOverride ?? stepNumber.toString()
    const enabled = isStepEnabled(step.id)
    const badge = enabled ? '✓' : displayLabel
    const circleClasses = [
      'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition',
      status === 'current'
        ? 'border-blue-400 bg-blue-500/80 text-white'
        : enabled
          ? 'border-emerald-400 bg-emerald-500/30 text-white'
          : 'border-white/30 text-white/60',
      disabled ? 'border-white/15 text-white/30' : '',
    ]
      .filter(Boolean)
      .join(' ')
    const labelClasses =
      status === 'current'
        ? 'text-center text-xs font-semibold text-white'
        : 'text-center text-xs font-semibold text-white/70'

    return (
      <button
        key={`step-trigger-${step.id}`}
        type="button"
        onClick={() => goToStep(step.id)}
        disabled={disabled}
        title={step.description}
        className={`flex min-w-[90px] flex-col items-center gap-2 rounded-2xl border border-transparent px-3 py-2 text-center transition ${
          disabled ? 'cursor-not-allowed opacity-40' : 'hover:border-white/20'
        }`}
      >
        <span className={circleClasses}>{badge}</span>
        <span className={labelClasses}>{step.label}</span>
      </button>
    )
  }

  const renderAdvancedTrigger = () => (
    <button
      type="button"
      onClick={() => setAdvancedExpanded(current => !current)}
      className="flex min-w-[72px] flex-col items-center gap-1 rounded-2xl border border-transparent px-2 py-2 text-center text-[11px] font-semibold text-white transition hover:border-white/20"
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition ${
          advancedExpanded ? 'border-blue-400 bg-blue-500/80 text-white' : 'border-white/30 text-white/70'
        }`}
      >
        {advancedGroupNumber}
      </span>
      <span>Advanced</span>
      <svg
        className={`h-3 w-3 transition ${advancedExpanded ? 'opacity-80' : 'opacity-50'}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )

  const renderActiveStepContent = () => {
    switch (activeStep) {
      case 'headers':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                checked={headerState.enabled}
                onChange={event => {
                  const enabled = event.target.checked
                  setHeaderState(current => ({ ...current, enabled }))
                  resetTransforms()
                }}
              />
              Enable header cleanup
            </label>
            {sheetOrder.length ? (
              <div className="text-xs text-white/70">
                <button
                  type="button"
                  onClick={handleOpenHeaderModal}
                  className="rounded-full border border-white/20 px-3 py-1 font-semibold text-white hover:border-white/40"
                >
                  Rename headers
                </button>
                <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-white/40">
                  Set explicit header labels even when cleanup is off.
                </p>
              </div>
            ) : null}
            {headerState.enabled ? (
              <div className="space-y-5 text-xs text-white/80">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">Apply to</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setHeaderState(current => ({ ...current, scope: 'all' }))}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        headerState.scope === 'all'
                          ? 'border-blue-400/70 bg-blue-500/10 text-white'
                          : 'border-white/20 text-white/70 hover:border-white/40'
                      }`}
                    >
                      All sheets
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        let nextSheet: string | null = null
                        setHeaderState(current => {
                          if (current.scope === 'some') return current
                          const fallback = current.sheets.length ? current.sheets : sheetOrder.slice(0, 1)
                          nextSheet = fallback[0] ?? null
                          return { ...current, scope: 'some', sheets: fallback }
                        })
                        if (nextSheet) focusPreviewSheet(nextSheet)
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        headerState.scope === 'some'
                          ? 'border-blue-400/70 bg-blue-500/10 text-white'
                          : 'border-white/20 text-white/70 hover:border-white/40'
                      }`}
                    >
                      Some sheets
                    </button>
                  </div>
                  {headerState.scope === 'some' && sheetOrder.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sheetOrder.map(sheet => (
                        <button
                          key={`header-scope-${sheet}`}
                          type="button"
                          onClick={() => {
                            let shouldFocus = false
                            setHeaderState(current => {
                              const alreadySelected = current.sheets.includes(sheet)
                              if (alreadySelected) {
                                if (current.sheets.length === 1) return current
                                return { ...current, sheets: current.sheets.filter(name => name !== sheet) }
                              }
                              shouldFocus = true
                              const nextSheets = [...current.sheets, sheet].sort(
                                (a, b) => sheetOrder.indexOf(a) - sheetOrder.indexOf(b),
                              )
                              return { ...current, sheets: nextSheets }
                            })
                            if (shouldFocus) focusPreviewSheet(sheet)
                          }}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            headerState.sheets.includes(sheet)
                              ? 'border-blue-400/70 bg-blue-500/10 text-white'
                              : 'border-white/20 text-white/70 hover:border-white/40'
                          }`}
                        >
                          {sheet}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">Whitespace handling</p>
                <div className="mt-3 space-y-3">
                  {(['trim-edges', 'remove-all', 'replace'] as HeaderWhitespace[]).map(mode => (
                    <label
                      key={mode}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${
                          headerState.whitespace === mode
                            ? 'border-blue-400/50 bg-blue-500/10 text-white'
                            : 'border-white/10 text-white/70'
                        }`}
                      >
                        <span className="font-semibold">{HEADER_WHITESPACE_LABELS[mode]}</span>
                        <input
                          type="radio"
                          name="header-whitespace"
                          className="h-4 w-4 text-blue-400 focus:ring-blue-400"
                          checked={headerState.whitespace === mode}
                          onChange={() => {
                            setHeaderState(current => ({ ...current, whitespace: mode }))
                            resetTransforms()
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  {headerState.whitespace === 'replace' ? (
                    <label className="mt-3 flex flex-col gap-1 text-xs text-white/60">
                      Replacement token
                      <input
                        type="text"
                        value={headerState.replacement}
                        onChange={event => {
                          setHeaderState(current => ({ ...current, replacement: event.target.value }))
                          resetTransforms()
                        }}
                        placeholder="_"
                        className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                      />
                    </label>
                  ) : null}
                  <label className="mt-3 flex items-center gap-2 text-xs text-white/70">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                      checked={headerState.collapseWhitespace}
                      onChange={event => {
                        const collapse = event.target.checked
                        setHeaderState(current => ({ ...current, collapseWhitespace: collapse }))
                        resetTransforms()
                      }}
                    />
                    Collapse duplicate internal spaces before formatting
                  </label>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">Letter casing</p>
                  <div className="mt-3 space-y-3">
                    {(['none', 'upper', 'lower'] as HeaderCase[]).map(mode => (
                      <label
                        key={mode}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${
                          headerState.letterCase === mode
                            ? 'border-blue-400/50 bg-blue-500/10 text-white'
                            : 'border-white/10 text-white/70'
                        }`}
                      >
                        <span className="font-semibold">{HEADER_CASE_LABELS[mode]}</span>
                        <input
                          type="radio"
                          name="header-case"
                          className="h-4 w-4 text-blue-400 focus:ring-blue-400"
                          checked={headerState.letterCase === mode}
                          onChange={() => {
                            setHeaderState(current => ({ ...current, letterCase: mode }))
                            resetTransforms()
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-white/50">
                  Blank headers automatically fall back to "Column N" after cleanup.
                </p>
              </div>
            ) : (
              <p className="text-xs text-white/50">Toggle on to trim whitespace and recase column headers before other transforms.</p>
            )}
          </div>
        )
      case 'column-order':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                checked={columnOrderState.enabled}
                onChange={event => handleColumnOrderToggle(event.target.checked)}
              />
              Enable custom ordering
            </label>
            {columnOrderState.enabled ? (
              <>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => columnOrderSheet && applyOrderToAllSheets(columnOrderSheet)}
                    className="rounded-full border border-white/20 px-3 py-1 font-semibold text-white hover:border-white/40"
                  >
                    Apply current order to all sheets
                  </button>
                  {columnOrderSheet ? (
                    <>
                      <button
                        type="button"
                        onClick={() => applyAlphabeticalOrder(columnOrderSheet, 'asc')}
                        className="rounded-full border border-white/20 px-3 py-1 font-semibold text-white hover:border-white/40"
                      >
                        A → Z
                      </button>
                      <button
                        type="button"
                        onClick={() => applyAlphabeticalOrder(columnOrderSheet, 'desc')}
                        className="rounded-full border border-white/20 px-3 py-1 font-semibold text-white hover:border-white/40"
                      >
                        Z → A
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateColumnOrder(
                            columnOrderSheet,
                            getDefaultOrder(columnCountForSheet(columnOrderSheet)),
                            'reset',
                          )
                        }
                        className="rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 font-semibold text-red-100 hover:border-red-300/70"
                      >
                        Reset order
                      </button>
                    </>
                  ) : null}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-100/80">
                      Sheet
                    </span>
                    {columnOrderTabs.map(sheet => (
                      <button
                        key={`order-tab-${sheet}`}
                        type="button"
                        onClick={() => {
                          setColumnOrderSheet(sheet)
                          focusPreviewSheet(sheet)
                        }}
                        className={`rounded-full border px-3 py-1 font-semibold ${
                          columnOrderSheet === sheet
                            ? 'border-amber-300/70 bg-amber-500/20 text-amber-50'
                            : 'border-amber-400/20 text-amber-100/70 hover:border-amber-300/60'
                        }`}
                      >
                        {sheet}
                      </button>
                    ))}
                  </div>
                  {columnOrderSheet ? (
                    renderColumnList(columnOrderSheet)
                  ) : (
                    <p className="mt-4 text-xs text-white/60">Choose a sheet to start reordering columns.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-white/50">Keep the original file column order or enable to drag them into a new sequence.</p>
            )}
          </div>
        )
      case 'dates':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                checked={dateState.enabled}
                onChange={event => handleDateToggle(event.target.checked)}
              />
              Enable date normalization
            </label>
            {dateState.enabled ? (
              <div className="space-y-5 text-xs text-white/80">
                {renderDateModeControls()}
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-[11px] text-white/60">
                  Date parsing only formats valid dates; non-date cells are left unchanged.
                </div>
                {dateState.mode === 'global' ? renderDateDefaultSelect() : null}
                {dateState.mode === 'per-column' ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {dateTabs.map(sheet => (
                        <button
                          key={`date-tab-${sheet}`}
                          type="button"
                          onClick={() => setDateSheet(sheet)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            dateSheet === sheet
                              ? 'border-blue-400/70 bg-blue-500/10 text-white'
                              : 'border-white/20 text-white/70 hover:border-white/40'
                          }`}
                        >
                          {sheet}
                        </button>
                      ))}
                    </div>
                    {dateSheet ? renderDateColumnList(dateSheet) : null}
                  </>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-white/50">Turn on to detect date-like cells and force consistent formatting.</p>
            )}
          </div>
        )
      case 'text-normalize':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                checked={textNormalizeState.enabled}
                onChange={event => handleTextNormalizeToggle(event.target.checked)}
              />
              Normalize casing & whitespace
            </label>
            {textNormalizeState.enabled ? (
              <div className="space-y-5 text-xs text-white/80">
                {renderTextNormalizeModeControls()}
                {(['global', 'global-with-overrides'] as TextNormalizeMode[]).includes(textNormalizeState.mode)
                  ? renderTextNormalizeGlobalControls()
                  : null}
                {(['per-column', 'global-with-overrides'] as TextNormalizeMode[]).includes(textNormalizeState.mode) ? (
                  <>
                    {textNormalizeState.mode === 'global-with-overrides' ? (
                      <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-[11px] text-white/60">
                        Overrides run after the global defaults, so you can fine-tune specific columns without losing the base rules.
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {textNormalizeTabs.map(sheet => (
                        <button
                          key={`text-tab-${sheet}`}
                          type="button"
                          onClick={() => setTextNormalizeSheet(sheet)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            textNormalizeSheet === sheet
                              ? 'border-blue-400/70 bg-blue-500/10 text-white'
                              : 'border-white/20 text-white/70 hover:border-white/40'
                          }`}
                        >
                          {sheet}
                        </button>
                      ))}
                    </div>
                    {textNormalizeSheet ? renderTextNormalizeColumnList(textNormalizeSheet) : null}
                  </>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-white/50">Trim leading/trailing spaces, collapse doubles, and enforce target casing.</p>
            )}
          </div>
        )
      case 'numeric':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                checked={numericCleanupState.enabled}
                onChange={event => handleNumericToggle(event.target.checked)}
              />
              Clean numeric columns
            </label>
            {numericCleanupState.enabled ? (
              <div className="space-y-5 text-xs text-white/80">
                <div className="flex flex-wrap gap-2">
                  {numericTabs.map(sheet => (
                    <button
                      key={`numeric-tab-${sheet}`}
                      type="button"
                      onClick={() => setNumericSheet(sheet)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        numericSheet === sheet
                          ? 'border-blue-400/70 bg-blue-500/10 text-white'
                          : 'border-white/20 text-white/70 hover:border-white/40'
                      }`}
                    >
                      {sheet}
                    </button>
                  ))}
                </div>
                {numericSheet ? renderNumericColumnList(numericSheet) : null}
              </div>
            ) : (
              <p className="text-xs text-white/50">Enable to strip $, enforce precision, or recast values as percent/currency.</p>
            )}
          </div>
        )
      case 'nulls':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                checked={nullState.enabled}
                onChange={event => {
                  const enabled = event.target.checked
                  setNullState(current => ({ ...current, enabled }))
                  resetTransforms()
                }}
              />
              Normalize null-like tokens
            </label>
            {activePreview ? (
              <div className="rounded-2xl border border-white/15 bg-black/30 px-4 py-2 text-[11px] text-white/60">
                {getPreviewSummaryForStep('nulls', activePreview)}
              </div>
            ) : null}
            {nullState.enabled ? (
              <div className="space-y-4 text-xs text-white/80">
                <div className="grid gap-3 sm:grid-cols-2">
                  {nullState.patterns.map(pattern => (
                    <label
                      key={pattern.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                        pattern.enabled ? 'border-blue-400/50 bg-blue-500/10 text-white' : 'border-white/10 text-white/70'
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{pattern.label}</p>
                        {pattern.helper ? (
                          <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">{pattern.helper}</p>
                        ) : null}
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                        checked={pattern.enabled}
                        onChange={() => handlePatternToggle(pattern.id)}
                      />
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={customPatternInput}
                    onChange={event => setCustomPatternInput(event.target.value)}
                    placeholder="Add custom token (case-insensitive)"
                    className="flex-1 rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-blue-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomPattern}
                    className="rounded-xl bg-blue-500/20 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500/30"
                  >
                    Add
                  </button>
                </div>
                {nullState.patterns.some(pattern => pattern.type === 'custom') ? (
                  <div className="flex flex-wrap gap-2">
                    {nullState.patterns
                      .filter(pattern => pattern.type === 'custom')
                      .map(pattern => (
                        <span
                          key={pattern.id}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                            pattern.enabled
                              ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100'
                              : 'border-white/20 text-white/70'
                          }`}
                        >
                          {pattern.label}
                          <button
                            type="button"
                            className="text-white/70 hover:text-white"
                            onClick={() => handleRemoveCustomPattern(pattern.id)}
                            aria-label={`Remove ${pattern.label}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-white/60">
                    Replacement value
                    <input
                      type="text"
                      value={nullState.replacement}
                      disabled={nullState.leaveEmpty}
                      onChange={event => {
                        setNullState(current => ({ ...current, replacement: event.target.value }))
                        resetTransforms()
                      }}
                      className="rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-white focus:border-blue-400 focus:outline-none disabled:opacity-50"
                    />
                  </label>
                  <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-white sm:mt-0">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                      checked={nullState.leaveEmpty}
                      onChange={event => {
                        setNullState(current => ({ ...current, leaveEmpty: event.target.checked }))
                        resetTransforms()
                      }}
                    />
                    Leave matching cells empty
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-xs text-white/50">Enable if you need to collapse blanks, "null", "-", or other placeholders.</p>
            )}
          </div>
        )
      case 'find-replace':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                checked={findReplaceState.enabled}
                onChange={event => handleFindReplaceToggle(event.target.checked)}
              />
              Enable find & replace
            </label>
            {findReplaceState.enabled ? (
              <div className="space-y-5 text-xs text-white/80">
                <div className="flex flex-wrap gap-2">
                  {findReplaceTabs.map(sheet => (
                    <button
                      key={`fr-tab-${sheet}`}
                      type="button"
                      onClick={() => setFindReplaceSheet(sheet)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        findReplaceSheet === sheet
                          ? 'border-blue-400/70 bg-blue-500/10 text-white'
                          : 'border-white/20 text-white/70 hover:border-white/40'
                      }`}
                    >
                      {sheet}
                    </button>
                  ))}
                </div>
                {findReplaceSheet ? renderFindReplaceRules(findReplaceSheet) : null}
              </div>
            ) : (
              <p className="text-xs text-white/50">Add regex or literal replacements per sheet.</p>
            )}
          </div>
        )
      case 'calculated':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                checked={calculatedState.enabled}
                onChange={event => handleCalculatedToggle(event.target.checked)}
              />
              Enable calculated fields
            </label>
            {calculatedState.enabled ? (
              <div className="space-y-5 text-xs text-white/80">
                <div className="flex flex-wrap gap-2">
                  {calculatedTabs.map(sheet => (
                    <button
                      key={`calc-tab-${sheet}`}
                      type="button"
                      onClick={() => setCalculatedSheet(sheet)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        calculatedSheet === sheet
                          ? 'border-blue-400/70 bg-blue-500/10 text-white'
                          : 'border-white/20 text-white/70 hover:border-white/40'
                      }`}
                    >
                      {sheet}
                    </button>
                  ))}
                </div>
                {calculatedSheet ? renderCalculatedRules(calculatedSheet) : null}
              </div>
            ) : (
              <p className="text-xs text-white/50">Create derived columns using math operations or concatenation.</p>
            )}
          </div>
        )
      case 'dedupe':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                checked={dedupState.enabled}
                onChange={event => handleDedupToggle(event.target.checked)}
              />
              Enable deduplication
            </label>
            {dedupState.enabled ? (
              <div className="space-y-5 text-xs text-white/80">
                <div className="flex flex-wrap gap-2">
                  {dedupTabs.map(sheet => (
                    <button
                      key={`dedup-tab-${sheet}`}
                      type="button"
                      onClick={() => setDedupSheet(sheet)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        dedupSheet === sheet
                          ? 'border-blue-400/70 bg-blue-500/10 text-white'
                          : 'border-white/20 text-white/70 hover:border-white/40'
                      }`}
                    >
                      {sheet}
                    </button>
                  ))}
                </div>
                {dedupSheet ? renderDedupConfig(dedupSheet) : null}
              </div>
            ) : (
              <p className="text-xs text-white/50">Choose key columns and how to merge conflicts to weed out duplicates.</p>
            )}
          </div>
        )
      case 'lookup':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-white">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
                checked={lookupState.enabled}
                onChange={event => handleLookupToggle(event.target.checked)}
                disabled={lookupDisabled}
              />
              Lookup / Enrichment
            </label>
            {lookupDisabled ? (
              <p className="rounded-2xl border border-white/15 bg-black/30 p-4 text-xs text-white/60">{lookupDisabledMessage}</p>
            ) : lookupState.enabled ? (
              <div className="space-y-5 text-xs text-white/80">
                <div className="flex flex-wrap gap-2">
                  {lookupTabs.map(sheet => (
                    <button
                      key={`lookup-tab-${sheet}`}
                      type="button"
                      onClick={() => setLookupSheet(sheet)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        lookupSheet === sheet
                          ? 'border-blue-400/70 bg-blue-500/10 text-white'
                          : 'border-white/20 text-white/70 hover:border-white/40'
                      }`}
                    >
                      {sheet}
                    </button>
                  ))}
                </div>
                {lookupSheet ? renderLookupConfig(lookupSheet) : null}
              </div>
            ) : (
              <p className="text-xs text-white/50">Add lookup joins once you enable this step.</p>
            )}
          </div>
        )
      case 'run-download':
        return (
          <div className="space-y-4 text-sm text-white/80">
            <p className="text-white/60">
              Transform order: headers → column order → dates → case & whitespace → numeric cleanup → nulls → find & replace → calculated fields → dedupe/merge → lookup.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRunTransformations}
                disabled={!canRunTransformations}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-500/80 px-4 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Run transformations
              </button>
              {canDownload ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2 font-semibold text-white transition hover:border-white/60"
                >
                  Download cleaned file
                </button>
              ) : null}
            </div>
            {statusMessage ? (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200">
                {statusMessage}
              </div>
            ) : null}
            {aggregatedPreviewSummary.length ? (
              <div className="rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-xs text-white/70">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Preview summary</p>
                <p className="text-white/50">Counts reflect the visible preview rows across selected sheets.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {aggregatedPreviewSummary.map(entry => (
                    <span
                      key={entry.label}
                      className="rounded-full border border-white/15 px-3 py-1 text-white/80"
                    >
                      {entry.value.toLocaleString()} {entry.label.toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-8 text-sm text-zinc-200">
      <input
        id={FILE_INPUT_ID}
        type="file"
        className="sr-only"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileChange}
      />

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">{errorMessage}</div>
      ) : null}

      {!fileInfo ? (
        <section className="p-8 text-center">
          <div className="mx-auto max-w-2xl space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Start cleaning</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Drop a CSV or XLSX</h2>
              <p className="mt-2 text-sm text-white/70">
                Dillon's Data Cleaner runs locally—perfect for polishing extracts before they touch a warehouse, dashboard, or notebook.
              </p>
            </div>
            <ol className="space-y-2 text-sm text-white/70">
              <li>1. Choose a CSV, XLS, or XLSX file.</li>
              <li>2. Toggle the cleanups you need.</li>
              <li>3. Run the transformation and download the cleaned file.</li>
            </ol>
            <label
              htmlFor={FILE_INPUT_ID}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-8 py-12 text-center text-zinc-300 transition ${
                isDragActive ? 'border-white/60 bg-black/40' : 'border-white/20 bg-black/30 hover:border-white/50 hover:bg-black/50'
              }`}
            >
              <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 16V4m0 0l3 3m-3-3L9 7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 16v2a2 2 0 002 2h8a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-base font-semibold text-white">Upload CSV / XLSX</span>
              <span className="text-xs text-white/60">Drag & drop supported</span>
            </label>
            <p className="text-xs text-white/50">No files leave your browser.</p>
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Current file</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{fileInfo.name}</h2>
                <p className="text-xs text-white/60">
                  {fileInfo.isXlsx ? 'Excel workbook' : 'CSV file'} · {formatBytes(fileInfo.size)}
                </p>
              </div>
              <label
                htmlFor={FILE_INPUT_ID}
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/50"
              >
                Choose a different file
              </label>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Sheet scope</p>
                  <p className="text-xs text-white/60">{sheetSummary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllSheets}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:border-white/40"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSheets}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70 hover:border-white/40 disabled:opacity-40"
                    disabled={!selectedSheets.length}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {sheetOrder.map(sheetName => {
                  const isSelected = selectedSheets.includes(sheetName)
                  return (
                    <button
                      key={`scope-${sheetName}`}
                      type="button"
                      onClick={() => handleSheetToggle(sheetName)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        isSelected
                          ? 'border-blue-400/70 bg-blue-500/10 text-white'
                          : 'border-white/20 text-white/70 hover:border-white/40'
                      }`}
                    >
                      {sheetName}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Workflow</p>
                <p className="text-sm text-white/60">Steps stay clickable anytime—this panel updates without hiding your preview.</p>
              </div>
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <div className="flex flex-nowrap items-center gap-1">
                    {baseStepperSteps.map((step, index) => (
                      <div key={`base-horizontal-${step.id}`} className="flex items-center">
                        {renderStepTrigger(step)}
                        {index < baseStepperSteps.length - 1 ? (
                          <div className="hidden h-px w-3 bg-white/15 sm:block" />
                        ) : null}
                      </div>
                    ))}
                    <div className="flex items-center">
                      <div className="hidden h-px w-3 bg-white/15 sm:block" />
                      {renderAdvancedTrigger()}
                      {runStepMeta ? (
                        <>
                          <div className="hidden h-px w-3 bg-white/15 sm:block" />
                          {renderStepTrigger(runStepMeta, { labelOverride: String(advancedGroupNumber + 1) })}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                {advancedExpanded ? (
                  <div className="overflow-x-auto">
                    <div className="mt-3 flex flex-nowrap items-center gap-1 rounded-2xl border border-white/10 bg-black/20 p-3">
                      {advancedStepperSteps.map((step, index) => (
                        <div key={`adv-horizontal-${step.id}`} className="flex items-center">
                          {renderStepTrigger(step, { labelOverride: `${String.fromCharCode(97 + index)}.` })}
                          {index < advancedStepperSteps.length - 1 ? (
                            <div className="hidden h-px w-3 bg-white/15 sm:block" />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Active step</p>
                <h3 className="text-2xl font-semibold text-white">{activeStepMeta.label}</h3>
                <p className="text-sm text-white/60">{activeStepMeta.description}</p>
              </div>
              <div className="mt-6">{renderActiveStepContent()}</div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  disabled={!previousStepId}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Back
                </button>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-white/50">
                    Step {activeStepIndex + 1} of {WORKFLOW_STEP_ORDER.length}
                  </span>
                  <button
                    type="button"
                    onClick={goToNextStep}
                    disabled={!nextStepId}
                    className="rounded-full bg-blue-500/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-semibold text-white">Live preview</p>
                  <p className="text-xs text-white/60">
                    {activePreview ? `Showing ${activePreview.name}` : 'Select a sheet to see live updates.'}
                  </p>
                </div>
                {previewSheets.length ? (
                  <div className="flex flex-wrap gap-2">
                    {previewSheets.map(sheet => (
                      <button
                        key={sheet.name}
                        type="button"
                        onClick={() => setActiveSheet(sheet.name)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          activePreview?.name === sheet.name
                            ? 'border-blue-400/70 bg-blue-500/20 text-white'
                            : 'border-white/20 text-white/70 hover:border-white/40'
                        }`}
                      >
                        {sheet.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {activePreview ? (
                <div className="mt-4 space-y-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/70">
                  {activeStepSummary ? <p>{activeStepSummary}</p> : null}
                  <p className="text-white/50">Highlighted cells show changes from: {activeStepMeta.label}.</p>
                  {activePreview.highlightNotice ? (
                    <p className="text-white/60">{activePreview.highlightNotice}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <div className="overflow-auto">
                  {activePreview ? (
                    <table className="min-w-full text-left text-xs text-white/90">
                      <thead className="bg-white/5 tracking-wide text-[11px] text-white/70">
                        <tr>
                          {activePreview.rows[0]?.map((cell, idx) => {
                            const isHighlighted = Boolean(activePreview.highlightMask?.[0]?.[idx])
                            return (
                              <th
                                key={`${activePreview.name}-header-${idx}`}
                                className={`px-3 py-2 ${
                                  isHighlighted ? 'bg-amber-500/20 text-white ring-1 ring-amber-300 ring-opacity-40' : ''
                                }`}
                              >
                                {renderCell(cell)}
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody className="bg-black/20">
                        {activePreview.rows.slice(1).map((row, rowIndex) => (
                          <tr key={`${activePreview.name}-row-${rowIndex}`} className="odd:bg-white/5">
                            {row.map((cell, cellIndex) => {
                              const isHighlighted = Boolean(activePreview.highlightMask?.[rowIndex + 1]?.[cellIndex])
                              return (
                                <td
                                  key={`${activePreview.name}-cell-${rowIndex}-${cellIndex}`}
                                  className={`px-3 py-2 ${
                                    isHighlighted
                                      ? 'bg-amber-500/30 text-white ring-1 ring-amber-400 ring-opacity-50'
                                      : 'text-white/80'
                                  }`}
                                >
                                  {renderCell(cell)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-4 py-10 text-center text-sm text-white/50">{SHEET_PLACEHOLDER}</div>
                  )}
                </div>
              </div>
            </div>
        </section>
      </>
    )}
      {isHeaderModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-zinc-950 p-6 text-sm text-white shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Headers</p>
                <h3 className="text-2xl font-semibold text-white">Rename columns</h3>
                <p className="text-xs text-white/60">
                  Override column labels when the automatic cleanup options are not enough.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseHeaderModal}
                className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/80 hover:border-white/40"
              >
                Close
              </button>
            </div>
            {sheetOrder.length ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">Apply</span>
                    <button
                      type="button"
                      onClick={() => setHeaderRenameScope('sheet')}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        headerRenameScope === 'sheet'
                          ? 'border-blue-400/70 bg-blue-500/10 text-white'
                          : 'border-white/20 text-white/70 hover:border-white/40'
                      }`}
                    >
                      This sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeaderRenameScope('all')}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        headerRenameScope === 'all'
                          ? 'border-blue-400/70 bg-blue-500/10 text-white'
                          : 'border-white/20 text-white/70 hover:border-white/40'
                      }`}
                    >
                      All sheets
                    </button>
                  </div>
                  {sheetOrder.map(sheet => (
                    <button
                      key={`rename-sheet-${sheet}`}
                      type="button"
                      onClick={() => setHeaderRenameSheet(sheet)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        headerRenameSheet === sheet
                          ? 'border-blue-400/70 bg-blue-500/10 text-white'
                          : 'border-white/20 text-white/70 hover:border-white/40'
                      }`}
                    >
                      {sheet}
                    </button>
                  ))}
                </div>
                {headerRenameSheet ? (
                  <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                    {(() => {
                      const sheetName = headerRenameSheet
                      const columnLabels = columnNamesBySheet[sheetName] ?? []
                      const totalColumns = columnLabels.length || rowsBySheet[sheetName]?.[0]?.length || 0
                      return Array.from({ length: totalColumns }, (_, index) => {
                        const overridesForSheet = headerOverrides[sheetName] ?? {}
                        const draftValue = headerRenameDrafts[sheetName]?.[index]
                        const displayValue =
                          draftValue !== undefined
                            ? draftValue
                            : overridesForSheet[index] ??
                              columnLabels[index] ??
                              getDefaultHeaderLabel(sheetName, index)
                        const renameError = headerRenameErrors[sheetName]?.[index] ?? null
                        return (
                          <div
                            key={`${sheetName}-rename-${index}`}
                            className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/80"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-semibold text-white">Column {index + 1}</p>
                              <button
                                type="button"
                                onClick={() => handleHeaderOverrideReset(sheetName, index)}
                                className="text-white/60 hover:text-white"
                              >
                                Reset
                              </button>
                            </div>
                            <label className="mt-2 flex flex-col gap-1">
                              New label
                              <input
                                type="text"
                                value={displayValue}
                                onChange={event => {
                                  const nextValue = event.target.value
                                  setHeaderRenameDrafts(current => ({
                                    ...current,
                                    [sheetName]: {
                                      ...(current[sheetName] ?? {}),
                                      [index]: nextValue,
                                    },
                                  }))
                                  if (nextValue.trim().length) {
                                    const applied = handleHeaderOverrideChange(sheetName, index, nextValue)
                                    if (applied) {
                                      setHeaderRenameDrafts(current => {
                                        const nextDrafts = { ...current }
                                        const sheetDrafts = { ...(nextDrafts[sheetName] ?? {}) }
                                        delete sheetDrafts[index]
                                        if (Object.keys(sheetDrafts).length) {
                                          nextDrafts[sheetName] = sheetDrafts
                                        } else {
                                          delete nextDrafts[sheetName]
                                        }
                                        return nextDrafts
                                      })
                                    }
                                  } else {
                                    setHeaderRenameDrafts(current => {
                                      const nextDrafts = { ...current }
                                      const sheetDrafts = { ...(nextDrafts[sheetName] ?? {}) }
                                      sheetDrafts[index] = ''
                                      nextDrafts[sheetName] = sheetDrafts
                                      return nextDrafts
                                    })
                                  }
                                }}
                                className={`rounded-xl border bg-black/30 px-3 py-2 text-white ${
                                  renameError ? 'border-red-500/60 focus:border-red-400' : 'border-white/15'
                                }`}
                              />
                            </label>
                            {renameError ? (
                              <p className="mt-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
                                {renameError}
                              </p>
                            ) : null}
                            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
                              Original: {getDefaultHeaderLabel(sheetName, index)}
                            </p>
                          </div>
                        )
                      })
                    })()}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-4 text-xs text-white/60">Upload a file to rename headers.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
