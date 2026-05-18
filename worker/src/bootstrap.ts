import path from "path";
import dotenv from "dotenv";

// Must run BEFORE any module that reads process.env (db.ts, baileys, etc.)
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

if (!process.env.DATABASE_URL) {
  console.error("[bootstrap] DATABASE_URL is not set — check jamix/.env.local");
  process.exit(1);
}
if (!process.env.WA_ENCRYPTION_KEY) {
  console.error("[bootstrap] WA_ENCRYPTION_KEY is not set — check jamix/.env.local");
  process.exit(1);
}
