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
  aiPausedChats: string[];
  aiEscalateOnHotLead: boolean;
  aiEscalateOnHandoff: boolean;
  aiHandoffMessage: string | null;
  aiKnowledgeBase: string | null;
}

export function shouldAiReply(inst: InstanceConfig, remoteJid: string): boolean {
  if (!inst.aiEnabled) return false;
  if (!inst.aiSystemPrompt) return false;
  if (inst.aiPausedChats.includes(remoteJid)) return false;

  if (inst.aiOnlyDuringHrs && inst.aiWorkStartHr != null && inst.aiWorkEndHr != null) {
    const hr = new Date().getHours();
    const start = inst.aiWorkStartHr;
    const end = inst.aiWorkEndHr;
    const inHours = start <= end ? hr >= start && hr < end : hr >= start || hr < end;
    if (!inHours) return false;
  }
  return true;
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

  return `${base}${business}${kb}${controls}\n\nТекущая дата: ${today}\n\nОтвечай коротко (1-3 предложения), на языке клиента. Не упоминай что ты AI без необходимости.`;
}

interface ReplyResult {
  reply: string;
  escalate?: { reason: string } | null;
  handoff?: boolean;
}

function parseControlTokens(raw: string): ReplyResult {
  let text = raw;
  let escalate: { reason: string } | null = null;
  let handoff = false;

  const escMatch = text.match(/\[ESCALATE:\s*([^\]]+)\]/i);
  if (escMatch) {
    escalate = { reason: escMatch[1].trim() };
    text = text.replace(escMatch[0], "").trim();
  }
  if (/\[HANDOFF\]/i.test(text)) {
    handoff = true;
    text = text.replace(/\[HANDOFF\]/gi, "").trim();
  }
  return { reply: text, escalate, handoff };
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
    const inst2 = await prisma.wAInstance.findUnique({ where: { id: inst.id } });
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
