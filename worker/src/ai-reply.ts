import OpenAI from "openai";
import { prisma } from "./db";
import { sendTelegram } from "./telegram";
import { blockContact } from "./antiban";

// Модель по умолчанию; список разрешённых — в src/lib/ai-models.ts (кабинет) и здесь
export const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5";

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (_client) return _client;
  _client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "missing",
    defaultHeaders: {
      "HTTP-Referer": "https://jamix.ai.kz",
      "X-Title": "Jamiwa",
    },
  });
  return _client;
}

import {
  InstanceConfig,
  LeadData,
  ReplyResult,
  PromptContext,
  buildSystemPromptParts,
  parseControlTokens,
  parseLeadFields,
  isWithinSchedule,
  localHourAndDay,
  formatLocalDateTime,
  managerStatus,
} from "../../src/lib/bot-prompt";
export type { InstanceConfig, LeadData, PromptContext };
export { parseControlTokens, parseLeadFields, isWithinSchedule, localHourAndDay, formatLocalDateTime, managerStatus };

export function shouldAiReply(inst: InstanceConfig, remoteJid: string): boolean {
  if (!inst.aiEnabled) return false;
  if (!inst.aiSystemPrompt) return false;
  if (inst.aiPausedChats.includes(remoteJid)) return false;

  if (inst.aiOnlyDuringHrs && inst.aiWorkStartHr != null && inst.aiWorkEndHr != null) {
    return isWithinSchedule(inst, new Date());
  }
  return true;
}

// ===== generate =====
const MAX_MSG_CHARS = 1000; // одно сообщение истории
const MAX_HISTORY_CHARS = 6000; // вся история
let lastAiErrorAlertAt = 0;

export async function generateAiReply(args: {
  inst: InstanceConfig;
  chatId: string;
  remoteJid: string;
  fromPhone: string | null;
  newUserMessage: string;
}): Promise<ReplyResult | null> {
  const { inst, chatId, remoteJid, fromPhone, newUserMessage } = args;

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { name: true, leadData: true, createdAt: true },
  });
  const history = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: Math.max(4, Math.min(inst.aiMaxTurns, 30)),
    select: { fromMe: true, text: true, manual: true, kind: true, createdAt: true },
  });
  const ordered = history.reverse();
  const firstBotMessage = !ordered.some((m) => m.fromMe && !m.manual);
  // Последний контакт до текущей серии: ищем сообщение старше 2 часов
  const prev = [...ordered].reverse().find((m) => Date.now() - m.createdAt.getTime() > 2 * 3600_000);

  const ctx: PromptContext = {
    chatName: chat?.name ?? null,
    leadData: (chat?.leadData as LeadData | null) ?? null,
    lastContactAt: prev?.createdAt ?? null,
    firstBotMessage,
  };

  // История: голосовые/медиа как пометки, реплики менеджера с префиксом, соседние реплики одной роли склеиваем,
  // начинаем с user, режем по длине
  type Msg = { role: "user" | "assistant"; content: string };
  const turns: Msg[] = [];
  for (const m of ordered) {
    let content = m.text?.trim() || "";
    if (!content) {
      if (m.kind === "voice") content = "[голосовое сообщение]";
      else if (m.kind === "image") content = "[фото]";
      else if (m.kind === "document") content = "[документ]";
      else continue;
    }
    if (content.length > MAX_MSG_CHARS) content = content.slice(0, MAX_MSG_CHARS) + "…";
    if (m.fromMe && m.manual) content = `(менеджер) ${content}`;
    const role: Msg["role"] = m.fromMe ? "assistant" : "user";
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n${content}`;
    else turns.push({ role, content });
  }
  if (!turns.length || turns[turns.length - 1].content.split("\n").pop() !== newUserMessage.trim()) {
    const last = turns[turns.length - 1];
    if (last && last.role === "user") last.content += `\n${newUserMessage}`;
    else turns.push({ role: "user", content: newUserMessage });
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  let total = turns.reduce((s, t) => s + t.content.length, 0);
  while (turns.length > 2 && total > MAX_HISTORY_CHARS) {
    total -= turns[0].content.length;
    turns.shift();
    while (turns.length && turns[0].role !== "user") turns.shift();
  }

  // Системный промпт двумя блоками: стабильный (роль, правила, база знаний) помечен для кэша провайдера —
  // при повторных ответах в течение 5 минут он считается по цене ~0,1×. Изменяемый (время, клиент) — следом.
  const { stable, volatile } = buildSystemPromptParts(inst, ctx);
  const systemContent = [
    { type: "text", text: stable, cache_control: { type: "ephemeral" } },
    { type: "text", text: volatile },
  ];
  const messages = [
    { role: "system" as const, content: systemContent as unknown as string },
    ...turns,
  ];

  try {
    const res = await getClient().chat.completions.create({
      model: inst.aiModel || DEFAULT_MODEL,
      messages,
      // Кириллица ~1 токен на 1–2 символа + JSON лида с русскими ключами ~150 токенов: 350 обрезало ответы
      max_tokens: 900,
      temperature: 0.3,
      // OpenRouter: у Sonnet 5.5 рассуждения включены по умолчанию — ~300 токенов на каждый ответ впустую
      ...({ reasoning: { enabled: false } } as object),
    });
    const raw = res.choices[0]?.message?.content?.trim() || "";
    const finish = res.choices[0]?.finish_reason;
    if (res.usage) {
      const cached = (res.usage as { prompt_tokens_details?: { cached_tokens?: number } }).prompt_tokens_details?.cached_tokens ?? 0;
      console.log(`[ai] ${inst.id} usage in=${res.usage.prompt_tokens} (cached ${cached}) out=${res.usage.completion_tokens} finish=${finish}`);
    }
    if (finish === "length") console.warn(`[ai] ${inst.id} reply truncated by max_tokens`);
    if (process.env.WA_LOG_LEVEL) console.log(`[ai] raw: ${raw.replace(/\n/g, " ⏎ ").slice(0, 400)}`);
    if (!raw) return null;

    const result = parseControlTokens(raw);

    if (result.lead) {
      try {
        await handleLead({ inst, chatId, remoteJid, fromPhone, lead: result.lead });
      } catch (e) {
        console.error(`[lead] ${inst.id} report failed:`, (e as Error).message);
      }
    }

    if (result.dnc) {
      await blockContact({ instanceId: inst.id, remoteJid, phoneNumber: fromPhone, trigger: "ответ модели [DNC]" });
    }

    if (result.escalate || result.handoff || result.ask) {
      await handleEscalation({ inst, chatId, remoteJid, fromPhone, escalate: result.escalate ?? null, handoff: result.handoff, ask: result.ask ?? null });
    }

    return result;
  } catch (e) {
    const err = e as Error & { status?: number };
    console.error(`[ai] generation failed for instance ${inst.id}:`, err.message);
    // Тихий отказ ИИ недопустим: алерт админу не чаще раза в 30 минут
    if (Date.now() - lastAiErrorAlertAt > 30 * 60_000) {
      lastAiErrorAlertAt = Date.now();
      const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID;
      if (adminChat) {
        await sendTelegram({
          chatId: adminChat,
          text: `🛑 <b>ИИ не отвечает</b>\nInstance: ${escapeHtml(inst.label || inst.id)}\nstatus=${err.status ?? "?"}\n${escapeHtml(err.message.slice(0, 300))}\n\nПроверь баланс OpenRouter / лимит ключа.`,
        }).catch(() => {});
      }
    }
    return null;
  }
}

/** Передача менеджеру / горячий лид / вопрос вне базы: в WA-группу отчётов и в Telegram; пауза бота до прихода менеджера. */
async function handleEscalation(args: {
  inst: InstanceConfig;
  chatId: string;
  remoteJid: string;
  fromPhone: string | null;
  escalate: { reason: string } | null;
  handoff?: boolean;
  ask: string | null;
}) {
  const { inst, chatId, remoteJid, fromPhone, escalate, handoff, ask } = args;
  const fromText = fromPhone ? `+${fromPhone}` : remoteJid.split("@")[0];
  const label = inst.label || inst.aiBusinessName || "WhatsApp";

  if (handoff) {
    // Пауза до начала рабочего дня менеджера, но не дольше 12 ч; менеджер, ответив, продлит её сам (inbound)
    const until = new Date(Date.now() + 12 * 3600_000);
    await prisma.chat.update({ where: { id: chatId }, data: { aiPausedUntil: until } });
    console.log(`[ai] handoff: chat ${chatId} paused until ${until.toISOString()}`);
  }

  const parts: string[] = [];
  if (escalate) parts.push(`🔥 Горячий клиент: ${fromText}\n${escalate.reason}`);
  if (handoff) parts.push(`🙋 Клиент ${fromText} просит менеджера. Бот в этом чате молчит — ответьте ему сами.`);
  if (ask) parts.push(`❓ Клиент ${fromText} спросил то, чего нет в базе знаний: «${ask}». Бот обещал уточнить — ответьте ему и добавьте в базу.`);
  if (!parts.length) return;
  const text = `${parts.join("\n\n")}\n\nНомер: ${label}`;

  if (inst.aiReportGroupJid) {
    const { sendText } = await import("./instance-manager");
    await sendText(inst.id, inst.aiReportGroupJid, text).catch((e) => console.warn(`[ai] group notify failed:`, (e as Error).message));
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: inst.tenantId }, select: { telegramChatId: true } });
  if (tenant?.telegramChatId) {
    await sendTelegram({ chatId: tenant.telegramChatId, text: escapeHtml(text) }).catch(() => {});
  }
}

/** Текст отчёта в группу менеджеров — формат, к которому привыкли после MoonAI. */
export function formatLeadReport(args: {
  lead: LeadData;
  fromPhone: string | null;
  remoteJid: string;
  instanceLabel: string | null;
  chatName: string | null;
}): string {
  const { lead, fromPhone, remoteJid, instanceLabel, chatName } = args;
  const head = lead.status === "meeting" ? "НАЗНАЧЕНА: ВСТРЕЧА" : "КВАЛИФИКАЦИЯ: ПРОВЕДЕНА";
  const lines = ["# Report", head];
  for (const [k, v] of Object.entries(lead.fields)) lines.push(`${k}: ${v}`);
  if (lead.status === "meeting" && lead.meeting) {
    if (lead.meeting.datetime) lines.push(`Время встречи: ${lead.meeting.datetime}`);
    if (lead.meeting.format) lines.push(`Формат: ${lead.meeting.format}`);
  }
  lines.push("");
  const phone = fromPhone ? `+${fromPhone}` : remoteJid.split("@")[0];
  lines.push(`Клиент: ${phone}${chatName ? ` (${chatName})` : ""}`);
  if (instanceLabel) lines.push(`Номер: ${instanceLabel}`);
  return lines.join("\n");
}

async function handleLead(args: {
  inst: InstanceConfig;
  chatId: string;
  remoteJid: string;
  fromPhone: string | null;
  lead: LeadData;
}) {
  const { inst, chatId, remoteJid, fromPhone, lead } = args;
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { leadData: true, leadStatus: true, name: true },
  });
  const prev = (chat?.leadData as LeadData | null) ?? null;
  const changed = JSON.stringify(prev) !== JSON.stringify(lead);
  if (!changed) return;

  // Статус не понижаем: встреча остаётся встречей, даже если модель в следующем ответе забыла
  const status = prev?.status === "meeting" && lead.status !== "meeting" ? "meeting" : lead.status;
  const merged: LeadData = {
    status,
    fields: { ...(prev?.fields || {}), ...lead.fields },
    meeting: lead.meeting ?? prev?.meeting ?? null,
  };
  await prisma.chat.update({
    where: { id: chatId },
    data: { leadData: merged as unknown as object, leadStatus: merged.status },
  });

  // Отчёт: один на клиента, а не на каждое новое поле. Ждём LEAD_REPORT_DEBOUNCE_MS тишины
  // (клиент за 10 минут называет имя, даты, состав — в группу уходит один «# Report»),
  // «встреча» — сразу.
  const newKeys = Object.keys(merged.fields).filter((k) => !prev?.fields?.[k]);
  const becameMeeting = merged.status === "meeting" && prev?.status !== "meeting";
  if (!newKeys.length && !becameMeeting) return;

  const pendingTimer = leadReportTimers.get(chatId);
  if (pendingTimer) clearTimeout(pendingTimer);
  if (becameMeeting) {
    leadReportTimers.delete(chatId);
    await sendLeadReport(inst, chatId, remoteJid, fromPhone);
    return;
  }
  leadReportTimers.set(
    chatId,
    setTimeout(() => {
      leadReportTimers.delete(chatId);
      sendLeadReport(inst, chatId, remoteJid, fromPhone).catch((e) => console.error(`[lead] report failed:`, (e as Error).message));
    }, LEAD_REPORT_DEBOUNCE_MS),
  );
}

const LEAD_REPORT_DEBOUNCE_MS = 10 * 60_000;
const leadReportTimers = new Map<string, NodeJS.Timeout>();

/** Берём актуальный лид из базы (за время ожидания могли добавиться поля) и шлём отчёт в группу и Telegram. */
async function sendLeadReport(inst: InstanceConfig, chatId: string, remoteJid: string, fromPhone: string | null) {
  const chat = await prisma.chat.findUnique({ where: { id: chatId }, select: { leadData: true, name: true, phoneNumber: true } });
  const lead = (chat?.leadData as LeadData | null) ?? null;
  if (!lead) return;
  const report = formatLeadReport({
    lead,
    fromPhone: fromPhone ?? chat?.phoneNumber ?? null,
    remoteJid,
    instanceLabel: inst.label,
    chatName: chat?.name ?? null,
  });

  if (inst.aiReportGroupJid) {
    const { sendText } = await import("./instance-manager");
    await sendText(inst.id, inst.aiReportGroupJid, report);
    console.log(`[lead] ${inst.id} report → group (${lead.status})`);
  }
  await prisma.chat.update({ where: { id: chatId }, data: { leadReportedAt: new Date() } });

  const tenant = await prisma.tenant.findUnique({ where: { id: inst.tenantId }, select: { telegramChatId: true } });
  if (tenant?.telegramChatId) {
    await sendTelegram({ chatId: tenant.telegramChatId, text: `<pre>${escapeHtml(report)}</pre>` }).catch(() => {});
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
