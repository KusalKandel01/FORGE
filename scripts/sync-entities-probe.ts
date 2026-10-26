// Prints SyncRecord counts per entity from the Turso cloud database, plus the
// newest record per entity so sync verification can be done from the CLI.
//
// Usage: bun scripts/sync-entities-probe.ts
import { PrismaClient } from '@prisma/client'

async function main() {
  const url = process.env.TURSO_DATABASE_URL
  if (!url) {
    console.error('Missing TURSO_DATABASE_URL')
    process.exit(1)
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaLibSQL } = require('@prisma/adapter-libsql') as typeof import('@prisma/adapter-libsql')

  const adapter = new PrismaLibSQL({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  })
  const prisma = new PrismaClient({ adapter })

  const grouped = await prisma.syncRecord.groupBy({
    by: ['entity'],
    _count: { _all: true },
    _max: { updatedAt: true },
    orderBy: { entity: 'asc' },
  })

  console.log('SyncRecords by entity:')
  for (const g of grouped) {
    console.log(
      `  ${g.entity.padEnd(18)} count=${String(g._count._all).padStart(4)}  latest=${g._max.updatedAt?.toISOString() ?? '-'}`
    )
  }

  if (grouped.length === 0) {
    console.log('  (empty bucket)')
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('SYNC ENTITIES PROBE FAILED:')
  console.error(err)
  process.exit(1)
})
