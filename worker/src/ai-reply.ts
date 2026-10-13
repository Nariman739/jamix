import OpenAI from "openai";
import { prisma } from "./db";
import { sendTelegram } from "./telegram";

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

interface InstanceConfig {
  id: string;
  tenantId: string;
  label: string | null;
  aiEnabled: boolean;
  aiModel: string;
  aiSystemPrompt: string | null;
  aiBusinessName: string | null;
  aiMaxTurns: number;
  aiOnlyDuringHrs: boolean;
  aiWorkStartHr: number | null;
  aiWorkEndHr: number | null;
  aiTimezone: string;
  aiWorkDays: number[];
  aiOffDaysActive: boolean;
  aiPausedChats: string[];
  aiEscalateOnHotLead: boolean;
  aiEscalateOnHandoff: boolean;
  aiHandoffMessage: string | null;
  aiKnowledgeBase: string | null;
  aiLeadFields: string | null;
  aiReportGroupJid: string | null;
}

/** Поля лида из настроек: по одному на строку, пустые и дубли выкидываем. */
export function parseLeadFields(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/\r?\n|;/)
        .map((s) => s.trim().replace(/^[-•*\d.)\s]+/, "").trim())
        .filter(Boolean),
    ),
  ).slice(0, 15);
}

export function shouldAiReply(inst: InstanceConfig, remoteJid: string): boolean {
  if (!inst.aiEnabled) return false;
  if (!inst.aiSystemPrompt) return false;
  if (inst.aiPausedChats.includes(remoteJid)) return false;

  if (inst.aiOnlyDuringHrs && inst.aiWorkStartHr != null && inst.aiWorkEndHr != null) {
    return isWithinSchedule(inst, new Date());
  }
  return true;
}

/** Час (0-23) и день недели ISO (1=пн … 7=вс) в таймзоне клиента. При кривой таймзоне — Asia/Almaty. */
export function localHourAndDay(date: Date, timeZone: string): { hour: number; day: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "numeric", weekday: "short" }).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Almaty", hourCycle: "h23", hour: "numeric", weekday: "short" }).formatToParts(date);
  }
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd) + 1 || 1;
  return { hour, day };
}

/**
 * Расписание бота. Окно часов [start, end) действует в aiWorkDays; окно может переходить через
 * полночь (18 → 9 = бот отвечает вечером и ночью). В остальные дни бот либо отвечает весь день
 * (aiOffDaysActive — режим «подменяю менеджера в выходные»), либо молчит.
 */
export function isWithinSchedule(
  inst: Pick<InstanceConfig, "aiWorkStartHr" | "aiWorkEndHr" | "aiTimezone" | "aiWorkDays" | "aiOffDaysActive">,
  now: Date,
): boolean {
  const { hour, day } = localHourAndDay(now, inst.aiTimezone || "Asia/Almaty");
  const days = inst.aiWorkDays?.length ? inst.aiWorkDays : [1, 2, 3, 4, 5, 6, 7];
  const start = inst.aiWorkStartHr ?? 0;
  const end = inst.aiWorkEndHr ?? 24;
  const wraps = start > end;
  const inWindow = wraps ? hour >= start || hour < end : hour >= start && hour < end;

  if (wraps && hour < end) {
    // Ночной хвост окна (после полуночи) относится к предыдущему дню: вечер пятницы продолжается в ночь субботы.
    const prev = day === 1 ? 7 : day - 1;
    if (days.includes(prev)) return true;
    if (days.includes(day)) return inWindow;
    return inst.aiOffDaysActive;
  }
  if (days.includes(day)) return inWindow;
  return inst.aiOffDaysActive;
}

function buildSystemPrompt(inst: InstanceConfig): string {
  const base = inst.aiSystemPrompt || "";
  const today = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const business = inst.aiBusinessName ? `\n\nКомпания: ${inst.aiBusinessName}` : "";

  const kb = inst.aiKnowledgeBase
    ? `\n\n=== БАЗА ЗНАНИЙ КОМПАНИИ (используй эту информацию в ответах) ===\n${inst.aiKnowledgeBase}\n=== КОНЕЦ БАЗЫ ===`
    : "";

  const controlTokens: string[] = [];
  const leadFields = parseLeadFields(inst.aiLeadFields);
  if (leadFields.length) {
    controlTokens.push(
      `Квалификация лида. По ходу разговора естественно, по одному вопросу за раз, выясни: ${leadFields.join(", ")}. ` +
        `Как только известны хотя бы имя и ещё одно поле — добавь в КОНЕЦ ответа отдельной строкой токен [LEAD: {...}] с JSON вида ` +
        `{"status":"qualified","fields":{"${leadFields[0]}":"…"},"meeting":null}. ` +
        `Если договорились о встрече/звонке — "status":"meeting" и "meeting":{"datetime":"7 октября 2026, 15:00","format":"онлайн (звонок)"}. ` +
        `Ключи в "fields" — ровно названия полей из списка, значения — кратко, как сказал клиент; неизвестные поля не включай. ` +
        `Повторяй токен в каждом ответе, где появились новые данные, всегда с полным актуальным JSON. Токен невидим для клиента.`,
    );
  }
  if (inst.aiEscalateOnHotLead) {
    controlTokens.push(
      `Когда клиент готов купить / записаться / оставил контакт — добавь в КОНЕЦ ответа отдельной строкой токен [ESCALATE: краткое описание лида]. Этот токен невидим для клиента, мы используем его чтобы уведомить менеджера.`,
    );
  }
  if (inst.aiEscalateOnHandoff) {
    controlTokens.push(
      `Когда клиент явно просит соединить с менеджером, оператором, человеком — добавь в конец ответа токен [HANDOFF]. После этого ты перестанешь отвечать в этом чате, менеджер ответит сам.`,
    );
  }
  const controls = controlTokens.length
    ? `\n\n=== СПЕЦИАЛЬНЫЕ ИНСТРУКЦИИ ===\n${controlTokens.join("\n")}`
    : "";

  return `${base}${business}${kb}${controls}\n\nТекущая дата: ${today}\n\nОтвечай коротко (1-3 предложения), на языке клиента. Не упоминай что ты AI без необходимости.\n\nЕсли клиент просит больше не писать ему (даже намёками: "достали", "хватит", "перестаньте", "удалите мой номер") — ответь коротко "Хорошо, не будем больше беспокоить. Если что — пишите." и НИЧЕГО НЕ ПРЕДЛАГАЙ.`;
}

export interface LeadData {
  status: "qualified" | "meeting";
  fields: Record<string, string>;
  meeting: { datetime?: string; format?: string } | null;
}

interface ReplyResult {
  reply: string;
  escalate?: { reason: string } | null;
  handoff?: boolean;
  lead?: LeadData | null;
}

/** Вырезает [LEAD: {...}] с учётом вложенных скобок JSON. */
function extractLeadToken(text: string): { lead: LeadData | null; text: string } {
  const start = text.search(/\[LEAD:/i);
  if (start < 0) return { lead: null, text };
  const jsonStart = text.indexOf("{", start);
  if (jsonStart < 0) return { lead: null, text: text.slice(0, start).trim() };
  let depth = 0;
  let end = -1;
  for (let i = jsonStart; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return { lead: null, text: text.slice(0, start).trim() };
  const closeBracket = text.indexOf("]", end);
  const cleaned = (text.slice(0, start) + text.slice(closeBracket >= 0 ? closeBracket + 1 : end + 1)).trim();
  try {
    const parsed = JSON.parse(text.slice(jsonStart, end + 1)) as Partial<LeadData>;
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.fields || {})) {
      if (v == null) continue;
      const s = String(v).trim();
      if (s && !/^(неизвестно|не указано|null|—|-)$/i.test(s)) fields[k.trim().slice(0, 60)] = s.slice(0, 200);
    }
    if (!Object.keys(fields).length) return { lead: null, text: cleaned };
    const meeting =
      parsed.meeting && typeof parsed.meeting === "object"
        ? {
            datetime: parsed.meeting.datetime ? String(parsed.meeting.datetime).slice(0, 120) : undefined,
            format: parsed.meeting.format ? String(parsed.meeting.format).slice(0, 80) : undefined,
          }
        : null;
    const status: LeadData["status"] = parsed.status === "meeting" || meeting?.datetime ? "meeting" : "qualified";
    return { lead: { status, fields, meeting }, text: cleaned };
  } catch {
    return { lead: null, text: cleaned };
  }
}

export function parseControlTokens(raw: string): ReplyResult {
  let escalate: { reason: string } | null = null;
  let handoff = false;

  const leadRes = extractLeadToken(raw);
  let text = leadRes.text;

  const escMatch = text.match(/\[ESCALATE:\s*([^\]]+)\]/i);
  if (escMatch) {
    escalate = { reason: escMatch[1].trim() };
    text = text.replace(escMatch[0], "").trim();
  }
  if (/\[HANDOFF\]/i.test(text)) {
    handoff = true;
    text = text.replace(/\[HANDOFF\]/gi, "").trim();
  }
  return { reply: text, escalate, handoff, lead: leadRes.lead };
}

export async function generateAiReply(args: {
  inst: InstanceConfig;
  chatId: string;
  remoteJid: string;
  fromPhone: string | null;
  newUserMessage: string;
}): Promise<ReplyResult | null> {
  const { inst, chatId, remoteJid, fromPhone, newUserMessage } = args;

  const history = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: inst.aiMaxTurns,
    select: { fromMe: true, text: true },
  });

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: buildSystemPrompt(inst) },
  ];

  for (const m of history.reverse()) {
    if (!m.text) continue;
    messages.push({ role: m.fromMe ? "assistant" : "user", content: m.text });
  }
  if (messages[messages.length - 1]?.content !== newUserMessage) {
    messages.push({ role: "user", content: newUserMessage });
  }

  try {
    const res = await getClient().chat.completions.create({
      model: inst.aiModel || "anthropic/claude-sonnet-4",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });
    const raw = res.choices[0]?.message?.content?.trim() || "";
    if (!raw) return null;

    const result = parseControlTokens(raw);

    // Лид: сохраняем в чат и шлём отчёт в группу менеджеров, если что-то изменилось
    if (result.lead) {
      try {
        await handleLead({ inst, chatId, remoteJid, fromPhone, lead: result.lead });
      } catch (e) {
        console.error(`[lead] ${inst.id} report failed:`, (e as Error).message);
      }
    }

    // Side-effects from control tokens
    if (result.escalate || result.handoff) {
      await handleEscalation({
        inst,
        remoteJid,
        fromPhone,
        escalate: result.escalate ?? null,
        handoff: result.handoff,
      });
    }

    // If handoff, append optional handoff message to user
    if (result.handoff && inst.aiHandoffMessage) {
      result.reply = `${result.reply}\n\n${inst.aiHandoffMessage}`.trim();
    }

    return result;
  } catch (e) {
    console.error(`[ai] generation failed for instance ${inst.id}:`, (e as Error).message);
    return null;
  }
}

async function handleEscalation(args: {
  inst: InstanceConfig;
  remoteJid: string;
  fromPhone: string | null;
  escalate: { reason: string } | null;
  handoff?: boolean;
}) {
  const { inst, remoteJid, fromPhone, escalate, handoff } = args;

  // Pause AI on handoff for this chat
  if (handoff) {
    const inst2 = await prisma.wAInstance.findUnique({ where: { id: inst.id }, select: { aiPausedChats: true } });
    if (inst2) {
      const set = new Set(inst2.aiPausedChats);
      set.add(remoteJid);
      await prisma.wAInstance.update({
        where: { id: inst.id },
        data: { aiPausedChats: [...set] },
      });
      console.log(`[ai] handoff: paused ${remoteJid} for ${inst.id}`);
    }
  }

  // Notify owner via Telegram
  const tenant = await prisma.tenant.findUnique({ where: { id: inst.tenantId } });
  if (!tenant?.telegramChatId) return;

  const label = inst.label || inst.aiBusinessName || "WhatsApp";
  const fromText = fromPhone ? `+${fromPhone}` : remoteJid.split("@")[0];
  let msg = "";
  if (escalate) {
    msg = `🔥 <b>Горячий лид</b> — ${escapeHtml(label)}\n\nКлиент: ${escapeHtml(fromText)}\nКонтекст: ${escapeHtml(escalate.reason)}\n\nОткройте чат в кабинете Jamiwa`;
  } else if (handoff) {
    msg = `🙋 <b>Клиент просит менеджера</b> — ${escapeHtml(label)}\n\nКлиент: ${escapeHtml(fromText)}\nAI поставлен на паузу в этом чате — ответьте вручную`;
  }
  if (msg) await sendTelegram({ chatId: tenant.telegramChatId, text: msg });
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

  // Отчёт: только когда поле появилось впервые или статус стал «встреча»
  const newKeys = Object.keys(merged.fields).filter((k) => !prev?.fields?.[k]);
  const becameMeeting = merged.status === "meeting" && prev?.status !== "meeting";
  if (!newKeys.length && !becameMeeting) return;

  const report = formatLeadReport({
    lead: merged,
    fromPhone,
    remoteJid,
    instanceLabel: inst.label,
    chatName: chat?.name ?? null,
  });

  if (inst.aiReportGroupJid) {
    const { sendText } = await import("./instance-manager");
    await sendText(inst.id, inst.aiReportGroupJid, report);
    await prisma.chat.update({ where: { id: chatId }, data: { leadReportedAt: new Date() } });
    console.log(`[lead] ${inst.id} report → group ${inst.aiReportGroupJid} (${merged.status})`);
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: inst.tenantId }, select: { telegramChatId: true } });
  if (tenant?.telegramChatId) {
    await sendTelegram({ chatId: tenant.telegramChatId, text: `<pre>${escapeHtml(report)}</pre>` }).catch(() => {});
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
