// Replicates src/lib/db.ts's Turso path in isolation and prints the REAL
// error when a Prisma query through the libSQL adapter fails.
//
// Usage: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... bun scripts/turso-prisma-probe.ts
import { PrismaClient } from '@prisma/client'

async function main() {
  const url = process.env.TURSO_DATABASE_URL
  if (!url) {
    console.error('Missing TURSO_DATABASE_URL')
    process.exit(1)
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaLibSQL } = require('@prisma/adapter-libsql') as typeof import('@prisma/adapter-libsql')

  // Prisma 6.x API: PrismaLibSQL takes the libSQL config object.
  const adapter = new PrismaLibSQL({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  })
  const prisma = new PrismaClient({ adapter })

  console.log('1. findUnique...')
  const row = await prisma.mediaCache.findUnique({
    where: { key: 'img:1:barbell squat exercise' },
  })
  console.log('   read result:', row ? 'HIT' : 'MISS (null)')

  console.log('2. upsert...')
  await prisma.mediaCache.upsert({
    where: { key: 'probe:write-test' },
    create: { key: 'probe:write-test', payload: JSON.stringify({ ok: true, at: Date.now() }) },
    update: { payload: JSON.stringify({ ok: true, at: Date.now() }) },
  })
  console.log('   write OK')

  console.log('3. count...')
  const n = await prisma.mediaCache.count()
  console.log('   MediaCache rows:', n)
}

main().catch((err) => {
  console.error('PRISMA+TURSO PROBE FAILED:')
  console.error(err)
  process.exit(1)
})
