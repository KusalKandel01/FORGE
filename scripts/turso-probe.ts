// One-off connectivity probe for the user's Turso instance.
// Usage: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... bun scripts/turso-probe.ts
import { createClient } from '@libsql/client'

async function main() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  if (!url || !token) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
    process.exit(1)
  }

  const db = createClient({ url, authToken: token })

  const ping = await db.execute('SELECT 1 AS ok')
  console.log('PING OK:', JSON.stringify(ping.rows))

  const tables = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  )
  console.log(
    'EXISTING TABLES:',
    JSON.stringify(tables.rows.map((r) => r.name as string))
  )
}

main().catch((err) => {
  console.error('TURSO PROBE FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
