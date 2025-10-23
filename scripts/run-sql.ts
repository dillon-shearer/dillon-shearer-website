// scripts/run-sql.ts
/**
 * Usage:
 *   pnpm sql -- "SELECT 1;"
 *   pnpm sql --file scripts/migrate.sql
 *   cat scripts/migrate.sql | pnpm sql
 *
 * Env:
 *   POSTGRES_URL=postgres://user:pass@host/db
 *   (Vercel Postgres also exposes POSTGRES_URL / POSTGRES_PRISMA_URL)
 */
import * as path from 'path'
import * as dotenv from 'dotenv'
// load .env.local, then .env (later calls don't overwrite existing vars)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })


import { Client } from 'pg'
import * as fs from 'fs'

type Args = {
  file?: string
  yes?: boolean
  noTransaction?: boolean
}
function parseArgs(): { sqlText?: string; args: Args } {
  const out: Args = {}
  const raw = process.argv.slice(2)

  let sqlText: string | undefined
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i]
    if (a === '--file' || a === '-f') {
      out.file = raw[++i]
    } else if (a === '--yes' || a === '-y') {
      out.yes = true
    } else if (a === '--no-transaction' || a === '--no-tx') {
      out.noTransaction = true
    } else if (a.startsWith('--')) {
      // ignore unknown flags
    } else {
      // first non-flag arg = inline SQL
      sqlText = (sqlText ?? '') + (sqlText ? ' ' : '') + a
    }
  }
  return { sqlText, args: out }
}

async function readSqlFromStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    if (process.stdin.isTTY) return resolve('')
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => (data += chunk))
    process.stdin.on('end', () => resolve(data))
    process.stdin.on('error', reject)
  })
}

function printResult(tag: string, res: any) {
  if (res?.rows?.length) {
    console.log(`\n-- ${tag}: ${res.rowCount} row(s)`)
    console.table(res.rows)
  } else {
    console.log(`\n-- ${tag}: ${res?.command ?? 'OK'} (${res?.rowCount ?? 0})`)
  }
}

async function main() {
  const { sqlText: inline, args } = parseArgs()
  const fromFile = args.file ? fs.readFileSync(args.file, 'utf8') : ''
  const fromStdin = await readSqlFromStdin()

  const sqlText = (inline || fromFile || fromStdin || '').trim()
  if (!sqlText) {
    console.error('No SQL provided. Use -- "SQL", --file <path>, or pipe via STDIN.')
    process.exit(1)
  }

  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL
  if (!url) {
    console.error('Missing POSTGRES_URL (or DATABASE_URL) in env.')
    process.exit(1)
  }

  if (!args.yes) {
    console.log('About to run SQL:\n')
    console.log(sqlText.length > 800 ? sqlText.slice(0, 800) + '…' : sqlText)
    console.log('\n(Use --yes to skip this prompt)')
  }

  const client = new Client({ connectionString: url })
  await client.connect()
  try {
    if (!args.noTransaction) await client.query('BEGIN')
    // node-postgres can execute multiple statements separated by semicolons
    const res = await client.query(sqlText)
    printResult('Result', res)
    if (!args.noTransaction) await client.query('COMMIT')
  } catch (e: any) {
    if (!args.noTransaction) await client.query('ROLLBACK')
    console.error('\nERROR:', e?.message || e)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})