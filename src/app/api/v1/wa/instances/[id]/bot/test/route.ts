import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireInstance, jsonError } from "@/lib/wa-api-helpers";

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

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  const body = (await req.json().catch(() => ({}))) as {
    messages?: { role: "user" | "assistant"; content: string }[];
    overridePrompt?: string;
    overrideModel?: string;
  };

  if (!body.messages || body.messages.length === 0) {
    return jsonError("messages required", 400);
  }

  const systemPrompt = body.overridePrompt || r.instance.aiSystemPrompt;
  if (!systemPrompt) {
    return jsonError("Системный промпт не задан — настрой роль бота сначала", 400);
  }

  const business = r.instance.aiBusinessName ? `\n\nКомпания: ${r.instance.aiBusinessName}` : "";
  const today = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    {
      role: "system",
      content: `${systemPrompt}${business}\n\nТекущая дата: ${today}\n\nОтвечай коротко (1-3 предложения).`,
    },
    ...body.messages,
  ];

  try {
    const res = await getClient().chat.completions.create({
      model: body.overrideModel || r.instance.aiModel || "anthropic/claude-sonnet-4",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });
    const reply = res.choices[0]?.message?.content?.trim() || "";
    return NextResponse.json({ reply });
  } catch (e) {
    return jsonError(`AI error: ${(e as Error).message}`, 502);
  }
}
