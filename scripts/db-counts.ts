// Row counts for a given libSQL/SQLite database.
// Usage: COUNT_DB_URL=file:... (or TURSO_DATABASE_URL=...) bun scripts/db-counts.ts
import { createClient } from '@libsql/client'

async function main() {
  const url =
    process.env.COUNT_DB_URL ||
    process.env.TURSO_DATABASE_URL ||
    'file:/home/z/my-project/db/custom.db'
  if (!url) {
    console.error('No database URL provided')
    process.exit(1)
  }
  const db = createClient(
    url.startsWith('libsql')
      ? { url, authToken: process.env.TURSO_AUTH_TOKEN || undefined }
      : { url }
  )

  const tables = [
    'User',
    'Post',
    'MediaCache',
    'TutorialImage',
    'SyncUser',
    'Device',
    'SyncRecord',
  ]
  for (const t of tables) {
    try {
      const r = await db.execute({ sql: `SELECT COUNT(*) AS n FROM "${t}"` })
      console.log(t.padEnd(14), Number(r.rows[0].n))
    } catch {
      console.log(t.padEnd(14), 'MISSING')
    }
  }
}

main().catch((err) => {
  console.error('COUNTS FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
