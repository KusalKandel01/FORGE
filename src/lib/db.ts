import { PrismaClient } from '@prisma/client'

/**
 * Database client with two deployment modes:
 *
 * 1. Local SQLite (default): uses DATABASE_URL, e.g.
 *      DATABASE_URL=file:/absolute/path/to/db/custom.db
 *
 * 2. Turso (free hosted SQLite, recommended on serverless hosts such as
 *    Vercel / Netlify / Cloudflare where a local file would be wiped on
 *    every deploy): set
 *      TURSO_DATABASE_URL=libsql://your-db-your-org.turso.io
 *      TURSO_AUTH_TOKEN=your-token
 *    When TURSO_DATABASE_URL is present it takes priority and the same
 *    Prisma schema talks to Turso through the libSQL driver adapter.
 */
function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim()
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim()

  if (tursoUrl) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client') as typeof import('@libsql/client')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require('@prisma/adapter-libsql') as typeof import('@prisma/adapter-libsql')
    const libsql = createClient({
      url: tursoUrl,
      authToken: authToken || undefined,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter, log: ['query'] })
  }

  return new PrismaClient({ log: ['query'] })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
