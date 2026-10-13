import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireInstance, jsonError } from "@/lib/wa-api-helpers";
import { buildSystemPrompt, parseControlTokens } from "@/lib/bot-prompt";
import { isAllowedModel, DEFAULT_MODEL } from "@/lib/ai-models";
import { effectivePlan } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (_client) return _client;
  _client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "missing",
    defaultHeaders: {
      "HTTP-Referer": "https://jamix.ai.kz",
      "X-Title": "Jamiwa Test",
    },
  });
  return _client;
}

const MAX_MESSAGES = 20;
const MAX_MSG_CHARS = 1000;
const MAX_PROMPT_CHARS = 8000;
// Тест-чат на общем ключе: не больше N вызовов в час на арендатора (память инстанса функции)
const TEST_RATE_MAX = 60;
const hits = new Map<string, number[]>();

/**
 * «Попробовать»: тот же системный промпт и разбор токенов, что и в бою (src/lib/bot-prompt.ts),
 * чтобы владелец проверял именно того бота, который будет писать клиентам.
 * Возвращаем и «что ушло бы менеджеру»: лид, горячий клиент, передача, вопрос вне базы.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  const tenant = await prisma.tenant.findUnique({ where: { id: r.authed.tenantId }, select: { plan: true, currentPeriodEnd: true } });
  if (!tenant || effectivePlan(tenant.plan, tenant.currentPeriodEnd) === "EXPIRED") {
    return jsonError("Тариф закончился — продлите, чтобы тестировать бота", 402);
  }

  const now = Date.now();
  const arr = (hits.get(r.authed.tenantId) || []).filter((t) => now - t < 3600_000);
  if (arr.length >= TEST_RATE_MAX) return jsonError("Слишком много тестовых сообщений, подождите час", 429);
  arr.push(now);
  hits.set(r.authed.tenantId, arr);

  const body = (await req.json().catch(() => ({}))) as {
    messages?: { role: "user" | "assistant"; content: string }[];
    overridePrompt?: string;
    overrideKnowledgeBase?: string;
  };

  const history = (body.messages || [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG_CHARS) }));
  if (!history.length) return jsonError("messages required", 400);
  if (body.overridePrompt && body.overridePrompt.length > MAX_PROMPT_CHARS) {
    return jsonError(`Промпт слишком длинный (макс ${MAX_PROMPT_CHARS})`, 400);
  }

  const inst = {
    ...r.instance,
    aiSystemPrompt: body.overridePrompt || r.instance.aiSystemPrompt,
    aiKnowledgeBase: body.overrideKnowledgeBase ?? r.instance.aiKnowledgeBase,
  };
  if (!inst.aiSystemPrompt) {
    return jsonError("Роль бота не задана — пройдите мастер настройки", 400);
  }
  const model = isAllowedModel(inst.aiModel) ? inst.aiModel : DEFAULT_MODEL;

  const system = buildSystemPrompt(inst, {
    chatName: "Тестовый клиент",
    leadData: null,
    lastContactAt: null,
    firstBotMessage: !history.some((m) => m.role === "assistant"),
  });

  try {
    const res = await getClient().chat.completions.create({
      model,
      messages: [{ role: "system", content: system }, ...history],
      max_tokens: 900,
      temperature: 0.3,
      ...({ reasoning: { enabled: false } } as object),
    });
    const raw = res.choices[0]?.message?.content?.trim() || "";
    const parsed = parseControlTokens(raw);
    return NextResponse.json({
      reply: parsed.reply,
      events: {
        lead: parsed.lead ?? null,
        escalate: parsed.escalate ?? null,
        handoff: !!parsed.handoff,
        ask: parsed.ask ?? null,
        dnc: !!parsed.dnc,
      },
      model,
    });
  } catch {
    return jsonError("ИИ сейчас недоступен, попробуйте через минуту", 502);
  }
}
