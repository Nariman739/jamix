// Non-destructive migration for anti-ban features.
// Adds: BlockedContact table + enum, fields on WAInstance.
// Run: node scripts/migrate-antiban.mjs
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = join(__dirname, "..", ".env.local");
const envText = readFileSync(envPath, "utf8");
const url = envText.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) throw new Error("DATABASE_URL not found in .env.local");

const sql = neon(url);

async function run() {
  console.log("=== anti-ban migration ===");

  // 1. Add enum BlockedReason
  console.log("• create enum BlockedReason");
  await sql`DO $$ BEGIN
    CREATE TYPE "BlockedReason" AS ENUM ('USER_REQUESTED', 'ADMIN_BLOCKED');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`;

  // 2. Add columns to WAInstance
  console.log("• add WAInstance columns: connectedAt, onlyReplies, bulkPausedUntil");
  await sql`ALTER TABLE "WAInstance" ADD COLUMN IF NOT EXISTS "connectedAt" TIMESTAMP(3);`;
  await sql`ALTER TABLE "WAInstance" ADD COLUMN IF NOT EXISTS "onlyReplies" BOOLEAN NOT NULL DEFAULT false;`;
  await sql`ALTER TABLE "WAInstance" ADD COLUMN IF NOT EXISTS "bulkPausedUntil" TIMESTAMP(3);`;

  // 3. Create BlockedContact table
  console.log("• create BlockedContact table");
  await sql`CREATE TABLE IF NOT EXISTS "BlockedContact" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "remoteJid" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "reason" "BlockedReason" NOT NULL DEFAULT 'USER_REQUESTED',
    "trigger" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockedContact_pkey" PRIMARY KEY ("id")
  );`;

  console.log("• indexes & FK on BlockedContact");
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "BlockedContact_instanceId_remoteJid_key"
    ON "BlockedContact"("instanceId", "remoteJid");`;
  await sql`CREATE INDEX IF NOT EXISTS "BlockedContact_instanceId_idx"
    ON "BlockedContact"("instanceId");`;

  // FK with ON DELETE CASCADE
  await sql`DO $$ BEGIN
    ALTER TABLE "BlockedContact" ADD CONSTRAINT "BlockedContact_instanceId_fkey"
      FOREIGN KEY ("instanceId") REFERENCES "WAInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN null; END $$;`;

  // 4. Backfill connectedAt for already-connected instances
  console.log("• backfill connectedAt from lastSeenAt for connected instances");
  await sql`UPDATE "WAInstance"
    SET "connectedAt" = COALESCE("lastSeenAt", "createdAt")
    WHERE "status" = 'CONNECTED' AND "connectedAt" IS NULL;`;

  console.log("✓ migration complete");
}

run().catch((e) => {
  console.error("✗ migration failed:", e);
  process.exit(1);
});
