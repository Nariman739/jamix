// Сливает дублирующиеся чаты (один контакт пришёл и как @lid и как @s.whatsapp.net).
// Через прямые SQL запросы (без Prisma).
import { Pool } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
const url = envText.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url) throw new Error("DATABASE_URL not found");

const pool = new Pool({ connectionString: url });

async function run() {
  console.log("=== merging duplicate chats ===");

  const client = await pool.connect();
  try {
    // Найти все группы чатов с одинаковым phoneNumber в рамках одного instance
    const dups = await client.query(`
      SELECT "instanceId", "phoneNumber", array_agg(id ORDER BY "createdAt") AS chat_ids
      FROM "Chat"
      WHERE "phoneNumber" IS NOT NULL
      GROUP BY "instanceId", "phoneNumber"
      HAVING count(*) > 1;
    `);

    console.log(`Found ${dups.rows.length} duplicate group(s)`);

    for (const g of dups.rows) {
      const chatIds = g.chat_ids;
      const keepId = chatIds[0];
      const dropIds = chatIds.slice(1);
      console.log(
        `• phoneNumber=${g.phoneNumber} keep=${keepId.slice(0, 8)} drop=${dropIds.length}`,
      );

      for (const dropId of dropIds) {
        const moved = await client.query(
          `UPDATE "Message" SET "chatId" = $1 WHERE "chatId" = $2`,
          [keepId, dropId],
        );
        console.log(`  - moved ${moved.rowCount} message(s) from ${dropId.slice(0, 8)}`);
        await client.query(`DELETE FROM "Chat" WHERE id = $1`, [dropId]);
      }

      // Обновить lastMsgAt
      await client.query(
        `UPDATE "Chat" SET "lastMsgAt" = (
          SELECT MAX("createdAt") FROM "Message" WHERE "chatId" = $1
        ) WHERE id = $1`,
        [keepId],
      );
    }

    console.log("✓ done");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error("✗ failed:", e);
  process.exit(1);
});
