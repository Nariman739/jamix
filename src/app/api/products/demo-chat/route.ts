import { NextRequest, NextResponse } from "next/server";
import { getOpenRouter, AI_MODEL } from "@/lib/openrouter";

const SYSTEM_PROMPT = `Ты — демо-бот сервиса Jamiwa. Jamiwa — это AI-ассистент для бизнеса в WhatsApp.

ТВОЯ ЗАДАЧА: показать посетителю лендинга как работает наш бот. Ты дружелюбный, краткий, ведёшь как реальный продавец бота.

ВАЖНО:
- Отвечай коротко (1-3 предложения), как в WhatsApp
- НЕ выдумывай фичи которых нет
- Если спросят цену — Старт 4990₸/мес, Pro 9990₸/мес, Бизнес 24990₸/мес. 3 дня FREE без карты.
- Если спросят про подключение — "по QR-коду, как WhatsApp Web, занимает 30 секунд"
- Если спросят как работает — "вы задаёте боту роль (например, 'продавец потолков'), даёте базу знаний (прайс, FAQ), и AI отвечает вашим клиентам в WhatsApp 24/7"
- Если спросят про бан — "у нас встроена защита: rate-limit, прогрев новых номеров, авто-пауза при сигналах"
- Если спросят про возврат денег — "Триал 3 дня бесплатно, оплата только после"
- Если посетитель готов попробовать — скажи: "Жми кнопку 'Подключить' выше — там QR-код твоего WhatsApp и пресет ролей под твой бизнес"

НЕ ОТВЕЧАЙ:
- На вопросы НЕ про Jamiwa (если спросят про погоду, политику, спорт — мягко верни в тему)
- Не обещай функций которых нет (мы НЕ делаем рассылки, групповые сообщения, кросс-платформы)

Тон: дружелюбный, на "ты", без формальностей. Можно с эмодзи (но без перебора).`;

type ClientMessage = {
  role: "user" | "assistant";
  content: string;
};

// Публичный эндпоинт без авторизации: ограничиваем частоту по IP и размер истории,
// иначе это бесплатный прокси к модели на нашем ключе (аудит 13.10, Д1).
const DEMO_MODEL = "anthropic/claude-haiku-5.5";
const MAX_MSG_CHARS = 500;
const MAX_HISTORY_CHARS = 3000;
const RATE_WINDOW_MS = 60 * 60_000;
const RATE_MAX = 20;
const hits = new Map<string, number[]>(); // память инстанса функции — не идеально, но дёшево

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) return true;
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Слишком много сообщений, попробуйте позже" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    messages?: ClientMessage[];
  };

  const history: ClientMessage[] = [];
  let total = 0;
  for (const m of (body.messages || []).slice(-10).reverse()) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") continue;
    const content = m.content.slice(0, MAX_MSG_CHARS);
    if (total + content.length > MAX_HISTORY_CHARS) break;
    total += content.length;
    history.unshift({ role: m.role, content });
  }
  if (history.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  try {
    const client = getOpenRouter();
    void AI_MODEL;
    const completion = await client.chat.completions.create({
      model: DEMO_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "Извини, не понял. Попробуй ещё раз?";
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[demo-chat] error:", (e as Error).message);
    return NextResponse.json({ error: "AI временно недоступен" }, { status: 500 });
  }
}
