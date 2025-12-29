import { createClient, createPool } from '@vercel/postgres'

export type GymCatalogColumn = {
  name: string
  dataType: string
}

export type GymCatalogTable = {
  name: string
  columns: GymCatalogColumn[]
}

export type CatalogAllowlist = {
  tables: Set<string>
  columns: Map<string, Set<string>>
  columnUnion: Set<string>
}

const NORMALIZE = (value: string) => value.trim().toLowerCase()
const TABLE_CACHE_TTL_MS = 5 * 60 * 1000
const ERROR_CACHE_TTL_MS = 60 * 1000
const TABLE_NAME_PATTERN = /^gym_/i

const FALLBACK_TABLES: GymCatalogTable[] = [
  {
    name: 'gym_lifts',
    columns: [
      { name: 'id', dataType: 'text' },
      { name: 'date', dataType: 'date' },
      { name: 'timestamp', dataType: 'timestamptz' },
      { name: 'exercise', dataType: 'text' },
      { name: 'weight', dataType: 'numeric' },
      { name: 'reps', dataType: 'integer' },
      { name: 'set_number', dataType: 'integer' },
      { name: 'day_tag', dataType: 'text' },
      { name: 'is_unilateral', dataType: 'boolean' },
      { name: 'equipment', dataType: 'text' },
    ],
  },
  {
    name: 'gym_day_meta',
    columns: [
      { name: 'date', dataType: 'date' },
      { name: 'day_tag', dataType: 'text' },
      { name: 'body_parts', dataType: 'text[]' },
      { name: 'updated_at', dataType: 'timestamptz' },
    ],
  },
]

let cachedTables: GymCatalogTable[] = FALLBACK_TABLES
let cachedContext = buildCatalogContext(FALLBACK_TABLES)
let cachedAllowlist = buildAllowlist(FALLBACK_TABLES)
let cacheExpiresAt = 0
let loadingPromise: Promise<GymCatalogTable[]> | null = null

function buildAllowlist(tables: GymCatalogTable[]): CatalogAllowlist {
  const tableSet = new Set<string>()
  const columnMap = new Map<string, Set<string>>()
  const columnUnion = new Set<string>()

  tables.forEach(table => {
    const normalized = NORMALIZE(table.name)
    tableSet.add(normalized)
    const columnSet = new Set<string>()
    table.columns.forEach(column => {
      const normalizedColumn = NORMALIZE(column.name)
      columnSet.add(normalizedColumn)
      columnUnion.add(normalizedColumn)
    })
    columnMap.set(normalized, columnSet)
  })

  return {
    tables: tableSet,
    columns: columnMap,
    columnUnion,
  }
}

function buildCatalogContext(tables: GymCatalogTable[]): string {
  if (!tables.length) {
    return 'Allowed tables: (none discovered)'
  }
  const lines: string[] = ['Allowed tables and columns:']
  tables.forEach(table => {
    const cols = table.columns.map(column => `${column.name} (${column.dataType})`).join(', ')
    lines.push(`- ${table.name}: ${cols}`)
  })
  lines.push('Rules: tables live in the public schema and are read-only. Columns ending in [] are arrays.')
  return lines.join('\n')
}

const formatArrayType = (dataType: string, udtName: string) => {
  if (dataType === 'ARRAY') {
    return `${udtName.replace(/^_/, '')}[]`
  }
  return dataType
}

const groupRowsIntoTables = (rows: Array<{ table_name: string; column_name: string; data_type: string; udt_name: string }>) => {
  const tableMap = new Map<string, GymCatalogTable>()
  rows.forEach(row => {
    const tableName = row.table_name
    if (!TABLE_NAME_PATTERN.test(tableName)) return
    const entry = tableMap.get(tableName) ?? { name: tableName, columns: [] }
    entry.columns.push({
      name: row.column_name,
      dataType: formatArrayType(row.data_type, row.udt_name),
    })
    tableMap.set(tableName, entry)
  })
  return Array.from(tableMap.values()).sort((a, b) => a.name.localeCompare(b.name))
}

const resolveConnectionString = () =>
  process.env.GYM_CHAT_SCHEMA_URL ||
  process.env.GYM_CHAT_DATABASE_URL_READONLY ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  ''

const isPooledConnectionString = (connectionString: string) =>
  connectionString.includes('-pooler.') || connectionString.includes('pooler.')

const runCatalogQuery = async (
  connectionString: string,
  query: string,
): Promise<Array<{ table_name: string; column_name: string; data_type: string; udt_name: string }>> => {
  if (isPooledConnectionString(connectionString)) {
    const pool = createPool({ connectionString })
    const client = await pool.connect()
    try {
      const result = await client.query<{ table_name: string; column_name: string; data_type: string; udt_name: string }>(query)
      return result.rows ?? []
    } finally {
      client.release()
      await pool.end()
    }
  }

  const client = createClient({ connectionString })
  await client.connect()
  try {
    const result = await client.query<{ table_name: string; column_name: string; data_type: string; udt_name: string }>(query)
    return result.rows ?? []
  } finally {
    await client.end()
  }
}

async function fetchCatalogFromDatabase(): Promise<GymCatalogTable[] | null> {
  const connectionString = resolveConnectionString()
  if (!connectionString) {
    console.warn('gym-chat catalog: missing connection string; using fallback schema.')
    return null
  }

  const rows = await runCatalogQuery(
    connectionString,
    `
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name LIKE 'gym_%'
      ORDER BY table_name, ordinal_position
    `,
  )
  if (!rows.length) {
    return null
  }
  return groupRowsIntoTables(rows)
}

const updateCache = (tables: GymCatalogTable[]) => {
  cachedTables = tables
  cachedContext = buildCatalogContext(tables)
  cachedAllowlist = buildAllowlist(tables)
}

export async function loadGymCatalog(options?: { force?: boolean }) {
  const now = Date.now()
  if (!options?.force && now < cacheExpiresAt) {
    return cachedTables
  }
  if (loadingPromise) {
    return loadingPromise
  }

  loadingPromise = (async () => {
    try {
      const tables = await fetchCatalogFromDatabase()
      if (tables && tables.length) {
        updateCache(tables)
        cacheExpiresAt = Date.now() + TABLE_CACHE_TTL_MS
      } else {
        cacheExpiresAt = Date.now() + ERROR_CACHE_TTL_MS
      }
    } catch (error) {
      cacheExpiresAt = Date.now() + ERROR_CACHE_TTL_MS
      console.error('gym-chat catalog: failed to load schema.', error)
    }
    return cachedTables
  })()

  try {
    return await loadingPromise
  } finally {
    loadingPromise = null
  }
}

export const getCatalogContext = () => cachedContext
export const getCatalogTables = () => cachedTables
export const getCatalogAllowlist = (): CatalogAllowlist => cachedAllowlist
export const getFallbackCatalog = () => FALLBACK_TABLES
