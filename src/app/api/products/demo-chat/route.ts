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

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    messages?: ClientMessage[];
  };

  const history = (body.messages || []).slice(-10); // keep last 10 turns
  if (history.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  try {
    const client = getOpenRouter();
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
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
