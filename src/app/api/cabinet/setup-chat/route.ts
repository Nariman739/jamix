import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantUser } from "@/lib/tenant-auth";
import { getOpenRouter, AI_MODEL } from "@/lib/openrouter";
import { SETUP_SYSTEM_PROMPT } from "@/lib/setup-assistant-prompt";

type ClientMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const user = await getCurrentTenantUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    messages?: ClientMessage[];
  };

  const history = (body.messages || []).slice(-20);
  if (history.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  try {
    const completion = await getOpenRouter().chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SETUP_SYSTEM_PROMPT },
        ...history,
      ],
      max_tokens: 1500,
      temperature: 0.6,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "";
    if (!reply) {
      return NextResponse.json({ error: "Пустой ответ AI" }, { status: 500 });
    }

    // Detect config block — finished flag
    const configMatch = reply.match(/```jamiwa-config\s*([\s\S]*?)\s*```/);
    let config: unknown = null;
    let visibleReply = reply;
    if (configMatch) {
      try {
        config = JSON.parse(configMatch[1]);
        visibleReply = reply.replace(configMatch[0], "").trim();
      } catch (e) {
        console.error("[setup] invalid JSON in config block:", (e as Error).message);
      }
    }

    return NextResponse.json({
      reply: visibleReply,
      finished: !!config,
      config,
    });
  } catch (e) {
    console.error("[setup-chat] error:", (e as Error).message);
    return NextResponse.json({ error: "AI временно недоступен" }, { status: 500 });
  }
}
