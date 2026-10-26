#!/usr/bin/env bun
/**
 * One-time initialization of a Turso database for FORGE cloud sync.
 *
 * Usage (run from the project root):
 *   TURSO_DATABASE_URL=libsql://your-db.turso.io \
 *   TURSO_AUTH_TOKEN=your-token \
 *   bun scripts/turso-init.mjs
 *
 * Creates exactly the tables defined in prisma/schema.prisma. Safe to run
 * twice (CREATE TABLE IF NOT EXISTS). No data is deleted.
 */
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL?.trim();
const token = process.env.TURSO_AUTH_TOKEN?.trim();

if (!url) {
  console.error("Missing TURSO_DATABASE_URL. Get it with: turso db show <name> --url");
  process.exit(1);
}

const db = createClient({ url, authToken: token || undefined });

const statements = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE TABLE IF NOT EXISTS "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "SyncUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "syncKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "SyncUser_syncKey_key" ON "SyncUser"("syncKey")`,
  `CREATE TABLE IF NOT EXISTS "Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SyncUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "SyncRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "clientUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SyncRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SyncUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "MediaCache" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "SyncRecord_userId_entity_recordId_key" ON "SyncRecord"("userId", "entity", "recordId")`,
  `CREATE INDEX IF NOT EXISTS "SyncRecord_userId_updatedAt_idx" ON "SyncRecord"("userId", "updatedAt")`,
  `CREATE INDEX IF NOT EXISTS "Device_userId_idx" ON "Device"("userId")`,
];

for (const sql of statements) {
  await db.execute(sql);
}

// Migration for databases created before clientUpdatedAt existed: add the
// column to an existing SyncRecord table. SQLite only allows constant
// defaults in ALTER TABLE, so migrated rows get the epoch: any real write
// from any device beats them. Fails harmlessly when the column is already
// there (CREATE TABLE above already covers fresh databases).
try {
  await db.execute(
    `ALTER TABLE "SyncRecord" ADD COLUMN "clientUpdatedAt" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'`
  );
  console.log("Migrated SyncRecord: added clientUpdatedAt column.");
} catch (err) {
  const message = String(err?.message ?? err);
  if (!/already exists|duplicate column/i.test(message)) {
    throw err;
  }
}

console.log("Done. Sync tables created in:", url);
