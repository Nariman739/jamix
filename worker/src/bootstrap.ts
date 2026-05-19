import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Must run BEFORE any module that reads process.env (db.ts, baileys, etc.)
// Search order (first match wins):
//   1. /opt/jamiwa/worker/.env             (production VPS — worker package root)
//   2. <__dirname>/../../.env              (local dev — worker/.env from src/)
//   3. <__dirname>/../../.env.local        (legacy — jamix/.env.local during dev when dist/worker/src compile)
//   4. <__dirname>/../../../.env.local     (legacy — jamix/.env.local when running from dist/)
const candidates = [
  "/opt/jamiwa/worker/.env",
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../.env.local"),
  path.resolve(__dirname, "../../../.env.local"),
];

const found = candidates.find((p) => fs.existsSync(p));
if (found) {
  dotenv.config({ path: found });
  console.log(`[bootstrap] loaded env from ${found}`);
}

if (!process.env.DATABASE_URL) {
  console.error("[bootstrap] DATABASE_URL is not set — tried:", candidates);
  process.exit(1);
}
if (!process.env.WA_ENCRYPTION_KEY) {
  console.error("[bootstrap] WA_ENCRYPTION_KEY is not set — tried:", candidates);
  process.exit(1);
}
