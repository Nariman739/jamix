// Token/cost protection — лимиты на AI-ответы чтобы клиенты не сожгли
// больше токенов чем оплачено.
import { prisma } from "./db";
import { sendTelegram } from "./telegram";

// План → дневной лимит AI ответов (должен совпадать с src/lib/plans.ts).
// Дублируется здесь чтобы worker не зависел от Next.js кода.
const DAILY_LIMITS: Record<string, number> = {
  TRIAL: 100,
  STARTER: 200,
  PRO: 2000,
  BUSINESS: 5000,
  EXPIRED: 0,
  FREE: 0, // legacy, обрабатываем как EXPIRED
};

// Per-chat защита: один контакт не может получить >15 AI-ответов в час
const PER_CHAT_HOURLY_CAP = 15;

// Длина входящего сообщения — если больше, AI не отвечает (защита от
// "проанализируй этот договор на 50 страниц")
export const MAX_INPUT_LENGTH = 2000;

// Глобальный admin trigger — если суммарно >N ответов за день, алерт админу
const GLOBAL_DAILY_ALERT_THRESHOLD = 10000;

type QuotaCheckResult =
  | { ok: true }
  | { ok: false; reason: string; code: "TENANT_LIMIT" | "CHAT_LIMIT" | "INPUT_TOO_LONG" | "EXPIRED" };

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Returns the effective daily limit for a tenant (по эффективному плану). */
function getDailyLimit(plan: string, currentPeriodEnd: Date | null): number {
  if (currentPeriodEnd && currentPeriodEnd < new Date()) return 0; // expired
  return DAILY_LIMITS[plan] ?? 0;
}

/**
 * Count AI-replies sent today for a tenant. We count outbound Messages where
 * the chat has incoming messages (i.e. it's a reply, not a manual cold-send).
 * Simpler heuristic: all fromMe messages today.
 */
async function countTenantAiToday(tenantId: string): Promise<number> {
  const since = startOfTodayUtc();
  return prisma.message.count({
    where: {
      instance: { tenantId },
      fromMe: true,
      createdAt: { gte: since },
    },
  });
}

async function countChatRepliesLastHour(chatId: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  return prisma.message.count({
    where: {
      chatId,
      fromMe: true,
      createdAt: { gte: since },
    },
  });
}

/**
 * Full preflight check before generating AI reply.
 * Returns ok=false with reason if any quota is exceeded.
 */
export async function checkAiQuota(args: {
  tenantId: string;
  chatId: string;
  inputText: string;
  plan: string;
  currentPeriodEnd: Date | null;
}): Promise<QuotaCheckResult> {
  // 1. Input length
  if (args.inputText.length > MAX_INPUT_LENGTH) {
    return {
      ok: false,
      reason: `input too long (${args.inputText.length} > ${MAX_INPUT_LENGTH})`,
      code: "INPUT_TOO_LONG",
    };
  }

  // 2. Plan expired
  const limit = getDailyLimit(args.plan, args.currentPeriodEnd);
  if (limit === 0) {
    return { ok: false, reason: "plan expired or has no AI quota", code: "EXPIRED" };
  }

  // 3. Tenant daily limit
  const todayCount = await countTenantAiToday(args.tenantId);
  if (todayCount >= limit) {
    return {
      ok: false,
      reason: `tenant daily limit reached (${todayCount}/${limit})`,
      code: "TENANT_LIMIT",
    };
  }

  // 4. Per-chat rate cap (anti-spam)
  const chatHour = await countChatRepliesLastHour(args.chatId);
  if (chatHour >= PER_CHAT_HOURLY_CAP) {
    return {
      ok: false,
      reason: `chat hourly cap reached (${chatHour}/${PER_CHAT_HOURLY_CAP})`,
      code: "CHAT_LIMIT",
    };
  }

  // 5. Soft-warn tenant at 80% (only once per day per tenant)
  if (todayCount > 0 && todayCount === Math.floor(limit * 0.8)) {
    void notifyTenantApproachingLimit(args.tenantId, todayCount, limit).catch(() => {});
  }

  return { ok: true };
}

async function notifyTenantApproachingLimit(tenantId: string, used: number, limit: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { telegramChatId: true, name: true },
  });
  if (!tenant?.telegramChatId) return;
  await sendTelegram({
    chatId: tenant.telegramChatId,
    text:
      `⚠️ <b>AI-лимит дня близок</b>\n\n` +
      `Использовано: <b>${used}/${limit}</b> ответов\n\n` +
      `После достижения лимита бот перестанет отвечать до завтра. Чтобы поднять лимит — переходи на следующий тариф.`,
  }).catch(() => {});
}

/**
 * Hourly global check — alerts admin if total replies today across all
 * tenants exceeds threshold. Called from main worker tick.
 */
let lastGlobalAlertDay = "";
export async function tickGlobalQuotaAlert() {
  const today = new Date().toISOString().slice(0, 10);
  if (lastGlobalAlertDay === today) return;
  const since = startOfTodayUtc();
  const total = await prisma.message.count({
    where: { fromMe: true, createdAt: { gte: since } },
  });
  if (total < GLOBAL_DAILY_ALERT_THRESHOLD) return;
  const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChat) return;
  lastGlobalAlertDay = today;
  await sendTelegram({
    chatId: adminChat,
    text:
      `🚨 <b>Global AI activity high</b>\n\n` +
      `Total AI replies today: <b>${total}</b> (threshold ${GLOBAL_DAILY_ALERT_THRESHOLD})\n\n` +
      `Check OpenRouter spend.`,
  }).catch(() => {});
}

export const QUOTA = {
  PER_CHAT_HOURLY_CAP,
  MAX_INPUT_LENGTH,
  GLOBAL_DAILY_ALERT_THRESHOLD,
  DAILY_LIMITS,
};
