// Anti-ban defenses for WhatsApp instances.
// Goal: protect numbers from being banned WITHOUT making clients feel restricted.
//
// 1. Soft rate limit: 1 msg/sec + jitter 300-1500ms — invisible to humans
// 2. Warm-up for new numbers: 50 / 200 / unlimited по дням (только cold-outreach лимит)
// 3. DNC: получатель сам сказал "стоп/не пишите" — больше не шлём
// 4. Bulk detection: >20 уникальных получателей за 5 мин = алерт; >50 = пауза
// 5. onlyReplies: тумблер — бот пишет только тем, кто написал первый
import { prisma } from "./db";
import { sendTelegram } from "./telegram";

// === DNC ===

// Триггеры для авто-DNC: получатель сам просит не писать.
// Регэксп matches как слово (с границами), case-insensitive, RU/KZ/EN.
const DNC_PATTERNS: RegExp[] = [
  /\bстоп\b/i,
  /\bстопп+\b/i,
  /\bстопстоп/i,
  /\bне\s+пиш[иу]\b/i,
  /\bне\s+пишите\b/i,
  /\bотпиш(и|и+те|ите)\b/i,
  /\bотписаться\b/i,
  /\bунsubscribe\b/i,
  /\bunsubscribe\b/i,
  /\bудалите\s+(меня|мой\s+номер)\b/i,
  /\bне\s+звоните\s+и\s+не\s+пиш[иу]/i,
  /\bхватит\s+писать\b/i,
  /\bбольше\s+не\s+пишите\b/i,
  /\btoqta\b/i, // KZ
  /\bжазбаңыз\b/i, // KZ "не пишите"
];

/** If incoming text matches DNC pattern, returns the matched phrase. Otherwise null. */
export function detectDncRequest(text: string): string | null {
  for (const re of DNC_PATTERNS) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

export async function blockContact(args: {
  instanceId: string;
  remoteJid: string;
  phoneNumber: string | null;
  trigger: string;
}) {
  await prisma.blockedContact.upsert({
    where: {
      instanceId_remoteJid: {
        instanceId: args.instanceId,
        remoteJid: args.remoteJid,
      },
    },
    create: {
      instanceId: args.instanceId,
      remoteJid: args.remoteJid,
      phoneNumber: args.phoneNumber,
      reason: "USER_REQUESTED",
      trigger: args.trigger,
    },
    update: {}, // already blocked — keep first record
  });
  console.log(`[dnc] ${args.instanceId} blocked ${args.remoteJid} (trigger="${args.trigger}")`);
}

export async function isBlocked(instanceId: string, remoteJid: string): Promise<boolean> {
  const found = await prisma.blockedContact.findUnique({
    where: { instanceId_remoteJid: { instanceId, remoteJid } },
    select: { id: true },
  });
  return !!found;
}

// === WARM-UP ===

// На сколько cold-outreach сообщений в день имеет право номер за время прогрева.
// Replies (ответы на входящие) лимитом не считаются — клиент не страдает.
export function warmupLimit(connectedAt: Date | null): number | null {
  if (!connectedAt) return null;
  const hours = (Date.now() - connectedAt.getTime()) / 3_600_000;
  if (hours < 24) return 50;
  if (hours < 72) return 200;
  return null; // unlimited after 72h
}

export function warmupStage(connectedAt: Date | null): "new" | "warming" | "ready" {
  if (!connectedAt) return "ready";
  const hours = (Date.now() - connectedAt.getTime()) / 3_600_000;
  if (hours < 24) return "new";
  if (hours < 72) return "warming";
  return "ready";
}

/**
 * Counts cold-outreach messages sent today on this instance.
 * "Cold" = в чате нет входящих сообщений (мы первые написали).
 */
export async function countTodayColdOutreach(instanceId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Chats with at least one incoming msg — это диалоги где клиент написал. Их не считаем.
  const chatsWithIncoming = await prisma.chat.findMany({
    where: {
      instanceId,
      messages: { some: { fromMe: false } },
    },
    select: { id: true },
  });
  const skipIds = chatsWithIncoming.map((c) => c.id);

  return prisma.message.count({
    where: {
      instanceId,
      fromMe: true,
      createdAt: { gte: startOfDay },
      chatId: { notIn: skipIds.length ? skipIds : ["__none__"] },
    },
  });
}

// === BULK DETECTION ===

const BULK_WARN_THRESHOLD = 20; // 20 уникальных за 5 мин — warning админу
const BULK_PAUSE_THRESHOLD = 50; // 50 — пауза с уведомлением tenant
const BULK_PAUSE_DURATION_MIN = 30;

/** Returns count of unique recipients in last N minutes for this instance. */
export async function countRecentUniqueRecipients(
  instanceId: string,
  minutes: number,
): Promise<number> {
  const since = new Date(Date.now() - minutes * 60_000);
  const rows = await prisma.message.findMany({
    where: {
      instanceId,
      fromMe: true,
      createdAt: { gte: since },
    },
    select: { chatId: true },
    distinct: ["chatId"],
  });
  return rows.length;
}

/** Run periodically to detect mass outreach. Alerts admin / pauses if over thresholds. */
export async function tickBulkDetection() {
  const instances = await prisma.wAInstance.findMany({
    where: { status: "CONNECTED" },
    select: {
      id: true,
      tenantId: true,
      label: true,
      phoneNumber: true,
      bulkPausedUntil: true,
      tenant: { select: { name: true, telegramChatId: true } },
    },
  });

  for (const inst of instances) {
    const recent = await countRecentUniqueRecipients(inst.id, 5);
    if (recent < BULK_WARN_THRESHOLD) continue;

    if (recent >= BULK_PAUSE_THRESHOLD && !inst.bulkPausedUntil) {
      const until = new Date(Date.now() + BULK_PAUSE_DURATION_MIN * 60_000);
      await prisma.wAInstance.update({
        where: { id: inst.id },
        data: { bulkPausedUntil: until },
      });
      console.warn(
        `[bulk] PAUSED ${inst.id} (${inst.label || inst.phoneNumber}): ${recent} recipients in 5min`,
      );
      // Notify tenant
      if (inst.tenant.telegramChatId) {
        await sendTelegram({
          chatId: inst.tenant.telegramChatId,
          text:
            `⚠️ <b>Похоже на массовую рассылку</b>\n\n` +
            `Номер: ${escapeHtml(inst.label || inst.phoneNumber || "WhatsApp")}\n` +
            `Получателей за 5 минут: ${recent}\n\n` +
            `Отправка приостановлена на ${BULK_PAUSE_DURATION_MIN} минут чтобы избежать бана. ` +
            `Если это легитимные ответы — снимите паузу в кабинете.`,
        });
      }
    }

    // Always notify admin (Nariman) on any bulk activity
    const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (adminChat) {
      await sendTelegram({
        chatId: adminChat,
        text:
          `🚨 <b>Bulk activity</b>\n\n` +
          `Tenant: ${escapeHtml(inst.tenant.name)}\n` +
          `Instance: ${escapeHtml(inst.label || inst.phoneNumber || inst.id)}\n` +
          `Recipients 5min: ${recent}\n` +
          `Action: ${recent >= BULK_PAUSE_THRESHOLD ? "PAUSED" : "monitoring"}`,
      });
    }
  }
}

// === REPLY-CONTEXT CHECK ===

/** Has incoming msg in this chat? Required for onlyReplies mode. */
export async function chatHasIncoming(chatId: string): Promise<boolean> {
  const m = await prisma.message.findFirst({
    where: { chatId, fromMe: false },
    select: { id: true },
  });
  return !!m;
}

// === HELPERS ===

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const ANTIBAN = {
  BULK_WARN_THRESHOLD,
  BULK_PAUSE_THRESHOLD,
  BULK_PAUSE_DURATION_MIN,
};
