// One-time data migration: local SQLite -> Turso.
// Copies everything EXCEPT the legacy TutorialImage table (old AI-drawn
// illustration cache, which is being removed from the app on purpose).
//
// Usage:
//   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... bun scripts/turso-copy.ts
import { createClient, type InValue } from '@libsql/client'

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN
if (!TURSO_DATABASE_URL) {
  console.error('Missing TURSO_DATABASE_URL')
  process.exit(1)
}

const local = createClient({ url: 'file:/home/z/my-project/db/custom.db' })
const remote = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN || undefined,
})

const TABLES: Record<string, string[]> = {
  User: ['id', 'email', 'name', 'createdAt', 'updatedAt'],
  Post: ['id', 'title', 'content', 'published', 'authorId', 'createdAt', 'updatedAt'],
  MediaCache: ['key', 'payload', 'createdAt'],
  SyncUser: ['id', 'syncKey', 'createdAt'],
  Device: ['id', 'userId', 'name', 'lastSeen'],
  SyncRecord: ['id', 'userId', 'entity', 'recordId', 'payload', 'updatedAt', 'deleted'],
}

async function main() {
  for (const [table, cols] of Object.entries(TABLES)) {
    const result = await local.execute({ sql: `SELECT * FROM "${table}"` })
    if (result.rows.length === 0) {
      console.log(`${table.padEnd(12)} empty, skipped`)
      continue
    }
    const colList = cols.map((c) => `"${c}"`).join(', ')
    const placeholders = cols.map(() => '?').join(', ')
    const statements = result.rows.map((row) => ({
      sql: `INSERT OR REPLACE INTO "${table}" (${colList}) VALUES (${placeholders})`,
      args: cols.map((c) => (row[c] ?? null) as InValue),
    }))
    for (let i = 0; i < statements.length; i += 20) {
      await remote.batch(statements.slice(i, i + 20), 'write')
    }
    console.log(`${table.padEnd(12)} copied ${result.rows.length} rows`)
  }
  console.log('Data migration complete.')
}

main().catch((err) => {
  console.error('COPY FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
