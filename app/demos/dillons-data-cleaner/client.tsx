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
}

type ColumnOrderState = {
  enabled: boolean
  orders: Record<string, number[]>
}

type FindReplaceMatchMode = 'equals' | 'contains' | 'regex'

type FindReplaceRule = {
  id: string
  scope: 'sheet' | 'columns'
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

type DateColumnConfig = {
  enabled: boolean
  format: string
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
type TextNormalizeMode = 'global' | 'per-column'

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

type LookupConfig = {
  referenceSheet: string | null
  prefix: string
  joins: LookupJoinPair[]
  importColumns: number[]
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
  'dd-MM-yyyy',
  'MM/dd/yyyy',
  'dd/MM/yyyy',
  'yyyy-MM-dd',
  'yyyy/MM/dd',
  'yyyy-MM-dd HH:mm',
]

const KNOWN_DATE_FORMATS = [
  'MM/dd/yyyy',
  'M/d/yyyy',
  'dd/MM/yyyy',
  'd/M/yyyy',
  'MM-dd-yyyy',
  'M-d-yyyy',
  'dd-MM-yyyy',
  'd-M-yyyy',
  'yyyy-MM-dd',
  'yyyy/MM/dd',
  'yyyyMMdd',
]

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
      text = text.trim().replace(/\s+/g, headerState.replacement || '_')
      break
    case 'trim-edges':
    default:
      text = text.trim()
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
    if (!rule.find.length) return
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

function formatDateValue(date: Date, format: string) {
  const pad = (value: number, length = 2) => value.toString().padStart(length, '0')
  const replacements: Record<string, string> = {
    yyyy: pad(date.getFullYear(), 4),
    MM: pad(date.getMonth() + 1),
    dd: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
  }
  return format.replace(/yyyy|MM|dd|HH|mm/g, token => replacements[token] ?? token)
}

function parseDateWithFormat(value: string, format: string) {
  const pattern = format
    .replace(/yyyy/, '(?<year>\\d{4})')
    .replace(/MM/, '(?<month>\\d{1,2})')
    .replace(/dd/, '(?<day>\\d{1,2})')
    .replace(/HH/, '(?<hour>\\d{1,2})')
    .replace(/mm/, '(?<minute>\\d{1,2})')
  const regex = new RegExp(`^${pattern}$`)
  const match = value.match(regex)
  if (!match || !match.groups) return null

  const year = Number(match.groups.year ?? '0')
  const month = Number(match.groups.month ?? '1') - 1
  const day = Number(match.groups.day ?? '1')
  const hour = Number(match.groups.hour ?? '0')
  const minute = Number(match.groups.minute ?? '0')

  const parsed = new Date(year, month, day, hour, minute)
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

function detectDateColumns(rows: CellValue[][]) {
  const detection: Record<number, boolean> = {}
  if (!rows.length) return detection
  const body = rows.slice(1)
  const maxSamples = 25

  rows[0].forEach((_, columnIndex) => {
    let samples = 0
    let hits = 0
    for (let i = 0; i < body.length; i += 1) {
      const candidate = body[i]?.[columnIndex]
      if (candidate === null || candidate === undefined || candidate === '') continue
      samples += 1
      if (parseDateValue(candidate)) hits += 1
      if (samples >= maxSamples) break
    }
    detection[columnIndex] = samples > 0 && hits / samples >= 0.6
  })

  return detection
}

function getDefaultOrder(length: number) {
  return Array.from({ length }, (_, idx) => idx)
}

function applyColumnOrder(rows: CellValue[][], state: ColumnOrderState, sheet: string) {
  const width = rows[0]?.length ?? 0
  const order = state.enabled ? state.orders[sheet] ?? getDefaultOrder(width) : getDefaultOrder(width)
  if (order.length !== width) {
    return { rows: rows.map(row => [...row]), order: getDefaultOrder(width) }
  }
  const orderedRows = rows.map(row => order.map(idx => row[idx] ?? ''))
  return { rows: orderedRows, order }
}

function computeCalculatedValue(type: CalculatedOperation, values: string[], delimiter: string) {
  const toNumber = (value: string) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : NaN
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

function isNumericLike(value: CellValue) {
  if (typeof value === 'number') return true
  if (typeof value !== 'string') return false
  const stripped = value.replace(/[$%,\s]/g, '').replace(/,/g, '')
  if (!stripped.length) return false
  return Number.isFinite(Number(stripped))
}

function detectNumericColumns(rows: CellValue[][]) {
  const detection: Record<number, boolean> = {}
  if (!rows.length) return detection
  const body = rows.slice(1)
  const maxSamples = 25
  rows[0].forEach((_, columnIndex) => {
    let samples = 0
    let hits = 0
    for (let i = 0; i < body.length; i += 1) {
      const candidate = body[i]?.[columnIndex]
      if (candidate === null || candidate === undefined || candidate === '') continue
      samples += 1
      if (isNumericLike(candidate)) hits += 1
      if (samples >= maxSamples) break
    }
    detection[columnIndex] = samples > 0 && hits / samples >= 0.7
  })
  return detection
}

function cleanNumericCell(value: CellValue, config: NumericColumnConfig): { next: CellValue; changed: boolean } {
  const raw = value == null ? '' : String(value)
  if (!raw.length) return { next: value ?? '', changed: false }
  const originalHasPercent = raw.includes('%')
  let text = raw
  if (config.stripSymbols) {
    text = text.replace(/[$\s]/g, '')
  }
  text = text.replace(/,/g, '').replace(/%/g, '')
  if (!text.length) return { next: value ?? '', changed: false }
  const parsed = Number(text)
  if (!Number.isFinite(parsed)) return { next: value ?? '', changed: false }
  const formatNumber = (num: number) => (config.precision === 'auto' ? num.toString() : num.toFixed(config.precision))
  if (config.format === 'percent') {
    const percentValue = originalHasPercent ? parsed : parsed * 100
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
}

function transformSheet({
  sheetName,
  rows,
  columnNames,
  allRowsBySheet,
  allColumnNames,
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
  limitRows,
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
    }
  }

  const { rows: orderedRows, order } = applyColumnOrder(rows, columnOrderState, sheetName)
  const working = orderedRows.map(row => [...row])
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

  const originalIndexByPosition = order.reduce<Record<number, number>>((acc, originalIndex, position) => {
    acc[position] = originalIndex
    return acc
  }, {})

  const columnLabelFor = (originalIndex: number, columnIndex: number) => {
    return (
      columnNames[originalIndex] ?? renderCell(working[0][columnIndex]) ?? `Column ${originalIndex + 1}`
    )
  }

  let headerChanges = 0
  working[0] = working[0].map(cell => {
    const current = cell == null ? '' : String(cell)
    const next = headerState.enabled ? applyHeaderFormatting(cell, headerState) : current
    if (next !== current) headerChanges += 1
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

  const dateConfigs = dateState.columns[sheetName] ?? {}
  const isDateColumn = (originalIndex: number) => {
    if (!dateState.enabled) return false
    const config = dateConfigs[originalIndex]
    if (!config) return false
    return config.enabled
  }

  const findRules = findReplaceState.rulesBySheet[sheetName] ?? []
  const calculatedRules = calculatedState.rulesBySheet[sheetName] ?? []
  const applicableCalculatedRules = calculatedState.enabled ? calculatedRules.filter(rule => rule.enabled) : []
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
      const columnLabel = columnLabelFor(originalIndex, columnIndex)
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
          }
        }
      }

      if (textNormalizeState.enabled) {
        if (textNormalizeState.mode === 'global') {
          const { next, changed } = normalizeTextCell(cellValue, textGlobalOptions)
          if (changed) {
            cellValue = next
            textNormalizeChanges += 1
          }
        } else {
          const config = textColumns[originalIndex]
          if (config?.enabled) {
            const { next, changed } = normalizeTextCell(cellValue, config)
            if (changed) {
              cellValue = next
              textNormalizeChanges += 1
            }
          }
        }
      }

      if (numericCleanupState.enabled) {
        const numericConfig = numericColumns[originalIndex]
        if (numericConfig?.enabled) {
          const { next, changed } = cleanNumericCell(cellValue, numericConfig)
          if (changed) {
            cellValue = next
            numericChanges += 1
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
          }
        }
      }

      if (findReplaceState.enabled && findRules.length) {
        const { next, changes } = applyFindReplaceRules(cellValue, originalIndex, findRules)
        if (changes > 0) {
          cellValue = next
          findChanges += changes
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
        if (result.length) calculatedChanges += 1
      })
    }

  }

  if (applicableCalculatedRules.length) {
    applicableCalculatedRules.forEach(rule => {
      working[0].push(rule.label || 'Calculated field')
    })
  }

  if (dedupConfig && hasDedupForSheet) {
    const headerRow = working[0]
    const keptRows: CellValue[][] = []
    const seen = new Map<string, { row: CellValue[]; index: number }>()
    working.slice(1).forEach(row => {
      const key = buildJoinKey(
        dedupConfig.keyColumns.map(originalIndex => getValueByOriginalIndex(row, originalIndex)),
      )
      if (!seen.has(key)) {
        const index = keptRows.length
        keptRows.push(row)
        seen.set(key, { row, index })
        return
      }
      dedupeRemovals += 1
      const existing = seen.get(key)!
      if (dedupConfig.keepStrategy === 'last') {
        keptRows[existing.index] = row
        seen.set(key, { row, index: existing.index })
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
      const referenceFindRules = findReplaceState.rulesBySheet[referenceSheetName] ?? []
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
          if (textNormalizeState.mode === 'global') {
            const { next } = normalizeTextCell(cellValue, textGlobalOptions)
            cellValue = next
          } else {
            const config = referenceTextColumns[originalIndex]
            if (config?.enabled) {
              const { next } = normalizeTextCell(cellValue, config)
              cellValue = next
            }
          }
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
      const referenceMap = new Map<string, CellValue[]>()
      referenceRows.slice(1).forEach(refRow => {
        const key = buildJoinKey(
          joinPairs.map(pair => transformReferenceCell(refRow[pair.referenceColumn], pair.referenceColumn)),
        )
        if (!referenceMap.has(key)) {
          referenceMap.set(key, refRow)
        }
      })
      working.slice(1).forEach(row => {
        const key = buildJoinKey(joinPairs.map(pair => getValueByOriginalIndex(row, pair.sourceColumn)))
        const refRow = referenceMap.get(key)
        importColumns.forEach(refIndex => {
          const value = refRow ? transformReferenceCell(refRow[refIndex], refIndex) : ''
          row.push(value ?? '')
          if (value != null && String(value).trim().length) lookupAdds += 1
        })
      })
      const referenceHeaders = allColumnNames[referenceSheetName] ?? []
      importColumns.forEach(refIndex => {
        const label = referenceHeaders[refIndex] ?? `Column ${refIndex + 1}`
        working[0].push(`${lookupConfig.prefix || 'Lookup'}: ${label}`)
      })
    }
    }
  }

  if (previewMode && hasLookupForSheet && lookupAdds === 0) {
    console.debug(`[Lookup] Preview added 0 matches for "${sheetName}". Check lookup configuration.`)
  }

  const finalRows = typeof limitRows === 'number' ? working.slice(0, limitRows + 1) : working

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
  const [selectedSheets, setSelectedSheets] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState<string | null>(null)
  const [nullState, setNullState] = useState<NullState>(() => createDefaultNullState())
  const [headerState, setHeaderState] = useState<HeaderState>(() => createDefaultHeaderState())
  const [columnOrderState, setColumnOrderState] = useState<ColumnOrderState>({ enabled: false, orders: {} })
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
  const [dateSheet, setDateSheet] = useState<string | null>(null)
  const [calculatedSheet, setCalculatedSheet] = useState<string | null>(null)
  const [textNormalizeSheet, setTextNormalizeSheet] = useState<string | null>(null)
  const [numericSheet, setNumericSheet] = useState<string | null>(null)
  const [dedupSheet, setDedupSheet] = useState<string | null>(null)
  const [lookupSheet, setLookupSheet] = useState<string | null>(null)
  const [dragColumn, setDragColumn] = useState<{ sheet: string; index: number } | null>(null)

  const numericDetectionBySheet = useMemo(() => {
    const map: Record<string, Record<number, boolean>> = {}
    Object.entries(rowsBySheet).forEach(([name, rows]) => {
      map[name] = detectNumericColumns(rows ?? [])
    })
    return map
  }, [rowsBySheet])

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

          const detection = detectDateColumns(normalized)
          const columnConfigs: Record<number, DateColumnConfig> = {}
          headers.forEach((_, idx) => {
            columnConfigs[idx] = {
              enabled: detection[idx] ?? false,
              format: DEFAULT_DATE_FORMAT,
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
            numericColumns[idx] = {
              enabled: numericDetection[idx] ?? false,
              stripSymbols: true,
              precision: 'auto',
              format: 'plain',
              currency: 'USD',
            }
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
          }
        })

        setRowsBySheet(mapped)
        setOriginalRowsBySheet(originalMap)
        setColumnNamesBySheet(names)
        setSheetOrder(workbook.SheetNames)
        setSelectedSheets(workbook.SheetNames)
        setActiveSheet(workbook.SheetNames[0])
        setColumnOrderState({ enabled: false, orders })
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
        setCustomPatternInput('')
        setColumnOrderSheet(null)
        setFindReplaceSheet(null)
        setDateSheet(null)
        setCalculatedSheet(null)
        setTextNormalizeSheet(null)
        setNumericSheet(null)
        setDedupSheet(null)
        setLookupSheet(null)
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
  ])

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

  const activePreview = useMemo(() => {
    if (!previewSheets.length) return null
    if (!activeSheet) return previewSheets[0]
    return previewSheets.find(sheet => sheet.name === activeSheet) ?? previewSheets[0]
  }, [activeSheet, previewSheets])

  const handleRunTransformations = useCallback(() => {
    if (!fileInfo) {
      setErrorMessage('Upload a file before running transformations.')
      return
    }
    if (!selectedSheets.length) {
      setErrorMessage('Select at least one sheet to transform.')
      return
    }
    setHasRunTransformations(true)
    setStatusMessage('Transformations applied. Download is now ready.')
    setErrorMessage(null)
  }, [fileInfo, selectedSheets.length])

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

    try {
      const prefixed = `dillons_data_cleaner_${fileInfo.name}`
      const sheetHasTransforms = (sheetName: string) => {
        if (headerState.enabled) return true
        if (columnOrderState.enabled) return true
        if (nullState.enabled) return true
        if (textNormalizeState.enabled) {
          if (textNormalizeState.mode === 'global') return true
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
          columnOrderState,
          dateState,
          textNormalizeState,
          numericCleanupState,
          calculatedState,
          nullState,
          findReplaceState,
          dedupState,
          lookupState,
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

  const sheetSummary = fileInfo ? `${selectedSheets.length} of ${sheetOrder.length} sheets selected` : 'No file loaded'
  const canRunTransformations = Boolean(fileInfo && selectedSheets.length)
  const canDownload = Boolean(fileInfo && hasRunTransformations)

  const columnNamesForSheet = (sheetName: string) => columnNamesBySheet[sheetName] ?? []

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


  const handleColumnOrderToggle = (checked: boolean) => {
    setColumnOrderState(current => ({ ...current, enabled: checked }))
    if (checked && !columnOrderSheet && sheetOrder.length) {
      setColumnOrderSheet(sheetOrder[0])
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
      const existing = current.columns[sheetName]?.[columnIndex] ?? {
        enabled: false,
        stripSymbols: true,
        precision: 'auto',
        format: 'plain',
        currency: 'USD',
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
          joins: (current.configsBySheet[sheetName]?.joins ?? []).filter(join => join.id !== joinId),
        },
      },
    }))
    resetTransforms()
  }

  const updateColumnOrder = (sheetName: string, nextOrder: number[]) => {
    setColumnOrderState(current => ({
      ...current,
      orders: {
        ...current.orders,
        [sheetName]: nextOrder,
      },
    }))
    resetTransforms()
  }

  const applyAlphabeticalOrder = (sheetName: string, direction: 'asc' | 'desc') => {
    const names = columnNamesForSheet(sheetName)
    const baseOrder = getDefaultOrder(names.length)
    const sorted = [...baseOrder].sort((a, b) => {
      const left = (names[a] ?? '').toLowerCase()
      const right = (names[b] ?? '').toLowerCase()
      if (left === right) return 0
      return direction === 'asc' ? (left < right ? -1 : 1) : left < right ? 1 : -1
    })
    updateColumnOrder(sheetName, sorted)
  }

  const applyOrderToAllSheets = (sourceSheet: string) => {
    const sourceOrder = columnOrderState.orders[sourceSheet]
    if (!sourceOrder) return
    const updatedOrders: Record<string, number[]> = {}
    sheetOrder.forEach(sheet => {
      const width = columnNamesForSheet(sheet).length
      if (width === sourceOrder.length) {
        updatedOrders[sheet] = [...sourceOrder]
      } else {
        updatedOrders[sheet] = getDefaultOrder(width)
      }
    })
    setColumnOrderState(current => ({ ...current, orders: updatedOrders }))
    resetTransforms()
  }

  const addFindReplaceRule = (sheetName: string) => {
    setFindReplaceState(current => ({
      ...current,
      rulesBySheet: {
        ...current.rulesBySheet,
        [sheetName]: [
          ...(current.rulesBySheet[sheetName] ?? []),
          {
            id: `rule-${Date.now()}`,
            scope: 'sheet',
            columns: [],
            matchMode: 'equals',
            caseSensitive: false,
            find: '',
            replace: '',
            enabled: true,
            regexError: null,
          },
        ],
      },
    }))
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
    const names = columnNamesForSheet(sheetName)
    const order = [...(columnOrderState.orders[sheetName] ?? getDefaultOrder(names.length))]
    const [removed] = order.splice(dragColumn.index, 1)
    order.splice(targetIndex, 0, removed)
    updateColumnOrder(sheetName, order)
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
    const names = columnNamesForSheet(sheetName)
    const order = columnOrderState.orders[sheetName] ?? getDefaultOrder(names.length)
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
                {names[columnIndex] ?? `Column ${columnIndex + 1}`}
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
    const names = columnNamesForSheet(sheetName)
    return (
      <div className="space-y-4">
        {rules.length === 0 ? <p className="text-xs text-white/60">No rules yet. Add one to get started.</p> : null}
        {rules.map(rule => (
          <div key={rule.id} className="rounded-2xl border border-white/15 bg-white/5 p-4 text-xs text-white/80">
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
                  onChange={event => updateFindReplaceRule(sheetName, rule.id, { scope: event.target.value as 'sheet' | 'columns' })}
                  className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                >
                  <option value="sheet">Entire sheet</option>
                  <option value="columns">Specific columns</option>
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
              <label className="mt-3 flex flex-col gap-1">
                Columns (Ctrl/Cmd-click to select multiple)
                <select
                  multiple
                  value={rule.columns.map(index => index.toString())}
                  onChange={event => {
                    const selected = Array.from(event.target.selectedOptions).map(option => Number(option.value))
                    updateFindReplaceRule(sheetName, rule.id, { columns: selected })
                  }}
                  className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
                >
                  {names.map((name, index) => (
                    <option key={`${sheetName}-${name}`} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
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
              <p className="mt-2 text-xs font-semibold text-red-300">{rule.regexError}</p>
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
    const names = columnNamesForSheet(sheetName)
    const configs = dateState.columns[sheetName] ?? {}
    return (
      <div className="mt-4 space-y-3">
        {names.length === 0 ? <p className="text-xs text-white/60">No headers detected.</p> : null}
        {names.map((name, index) => {
          const config = configs[index] ?? { enabled: false, format: dateState.defaultFormat }
          const displayMode = dateState.mode
          const checkboxDisabled = displayMode === 'global'
          const enabled = config.enabled
          return (
            <div key={`${sheetName}-date-${index}`} className="rounded-2xl border border-white/15 bg-white/5 p-4 text-xs text-white/80">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{name}</p>
                  <p className="text-white/50">Samples: {getDateSamples(rowsBySheet[sheetName] ?? [], index).join(', ') || '—'}</p>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/30 bg-transparent text-blue-400 focus:ring-blue-400"
                    checked={enabled}
                    disabled={checkboxDisabled}
                    onChange={event => updateDateColumn(sheetName, index, { enabled: event.target.checked })}
                  />
                  Treat as date
                </label>
              </div>
              {(dateState.mode === 'per-column' && config.enabled) || dateState.mode === 'global' ? (
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
    const names = columnNamesForSheet(sheetName)
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
    <div className="mt-4 grid gap-3 text-xs text-white/80 sm:grid-cols-2">
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
    const names = columnNamesForSheet(sheetName)
    const configs = numericCleanupState.columns[sheetName] ?? {}
    const detection = numericDetectionBySheet[sheetName] ?? {}
    const numericColumns = names.map((name, index) => ({ name, index, detected: Boolean(detection[index]) }))
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
        {numericColumns.map(({ name, index, detected }) => {
          const config = configs[index] ?? {
            enabled: false,
            stripSymbols: true,
            precision: 'auto',
            format: 'plain',
            currency: 'USD',
          }
          return (
            <div key={`${sheetName}-numeric-${index}`} className="rounded-2xl border border-white/15 bg-white/5 p-4 text-xs text-white/80">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{name}</p>
                    {detected ? (
                      <span className="rounded-full border border-emerald-400/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200/80">
                        Auto
                      </span>
                    ) : null}
                  </div>
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
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                      Percent mode multiplies decimals by 100 unless the input already includes a % symbol.
                    </p>
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
    const names = columnNamesForSheet(sheetName)
    return (
      <div className="space-y-4 text-xs text-white/80">
        <label className="flex flex-col gap-1">
          Key columns (Ctrl/Cmd + click)
          <select
            multiple
            value={config.keyColumns.map(index => index.toString())}
            onChange={event => {
              const selected = Array.from(event.target.selectedOptions).map(option => Number(option.value))
              updateDedupConfig(sheetName, { keyColumns: selected })
            }}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
          >
            {names.map((name, index) => (
              <option key={`${sheetName}-dedup-${name}`} value={index}>
                {name}
              </option>
            ))}
          </select>
        </label>
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
    }
    const names = columnNamesForSheet(sheetName)
    const referenceNames = config.referenceSheet ? columnNamesBySheet[config.referenceSheet] ?? [] : []
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
                  {names.map((name, index) => (
                    <option key={`${sheetName}-lookup-source-${name}`} value={index}>
                      {name}
                    </option>
                  ))}
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
                  {referenceNames.map((name, index) => (
                    <option key={`${sheetName}-lookup-ref-${name}`} value={index}>
                      {name}
                    </option>
                  ))}
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
        <label className="flex flex-col gap-1">
          Columns to pull in (Ctrl/Cmd + click)
          <select
            multiple
            value={config.importColumns.map(index => index.toString())}
            onChange={event => {
              const selected = Array.from(event.target.selectedOptions).map(option => Number(option.value))
              updateLookupConfig(sheetName, { importColumns: selected })
            }}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
          >
            {referenceNames.map((name, index) => (
              <option key={`${sheetName}-lookup-import-${name}`} value={index}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
    )
  }

  const renderCalculatedRules = (sheetName: string) => {
    const rules = calculatedState.rulesBySheet[sheetName] ?? []
    const names = columnNamesForSheet(sheetName)
    return (
      <div className="space-y-4">
        {rules.length === 0 ? <p className="text-xs text-white/60">No calculated fields yet. Add one to get started.</p> : null}
        {rules.map(rule => (
          <div key={rule.id} className="rounded-2xl border border-white/15 bg-white/5 p-4 text-xs text-white/80">
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
            <label className="mt-3 flex flex-col gap-1">
              Source columns (Ctrl/Cmd-click to select multiple)
              <select
                multiple
                value={rule.sources.map(index => index.toString())}
                onChange={event => {
                  const selected = Array.from(event.target.selectedOptions).map(option => Number(option.value))
                  const persisted = rule.sources.filter(value => selected.includes(value))
                  const additions = selected.filter(value => !persisted.includes(value))
                  updateCalculatedRule(sheetName, rule.id, { sources: [...persisted, ...additions] })
                }}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2"
              >
                {names.map((name, index) => (
                  <option key={`${sheetName}-calc-${name}`} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
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
            {headerState.enabled ? (
              <div className="space-y-5 text-xs text-white/80">
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
                        onClick={() =>
                          updateColumnOrder(
                            columnOrderSheet,
                            getDefaultOrder(columnNamesForSheet(columnOrderSheet).length),
                          )
                        }
                        className="rounded-full border border-white/20 px-3 py-1 font-semibold text-white hover:border-white/40"
                      >
                        Original order
                      </button>
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
                    </>
                  ) : null}
                </div>
                <div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {columnOrderTabs.map(sheet => (
                      <button
                        key={`order-tab-${sheet}`}
                        type="button"
                        onClick={() => setColumnOrderSheet(sheet)}
                        className={`rounded-full border px-3 py-1 font-semibold ${
                          columnOrderSheet === sheet
                            ? 'border-blue-400/70 bg-blue-500/10 text-white'
                            : 'border-white/20 text-white/70 hover:border-white/40'
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
                {textNormalizeState.mode === 'global' ? renderTextNormalizeGlobalControls() : null}
                {textNormalizeState.mode === 'per-column' ? (
                  <>
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
        <section className="rounded-3xl border border-white/10 bg-black/40 p-8 text-center">
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
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <div className="overflow-auto">
                  {activePreview ? (
                    <table className="min-w-full text-left text-xs text-white/90">
                      <thead className="bg-white/5 tracking-wide text-[11px] text-white/70">
                        <tr>
                          {activePreview.rows[0]?.map((cell, idx) => (
                            <th key={`${activePreview.name}-header-${idx}`} className="px-3 py-2">
                              {renderCell(cell)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-black/20">
                        {activePreview.rows.slice(1).map((row, rowIndex) => (
                          <tr key={`${activePreview.name}-row-${rowIndex}`} className="odd:bg-white/5">
                            {row.map((cell, cellIndex) => (
                              <td key={`${activePreview.name}-cell-${rowIndex}-${cellIndex}`} className="px-3 py-2 text-white/80">
                                {renderCell(cell)}
                              </td>
                            ))}
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
  </div>
  )
}
