import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstance, jsonError } from "@/lib/wa-api-helpers";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  return NextResponse.json({ bot: pickBot(r.instance) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  const body = (await req.json().catch(() => ({}))) as Partial<{
    aiEnabled: boolean;
    aiModel: string;
    aiSystemPrompt: string | null;
    aiBusinessName: string | null;
    aiGreeting: string | null;
    aiMaxTurns: number;
    aiOnlyDuringHrs: boolean;
    aiWorkStartHr: number | null;
    aiWorkEndHr: number | null;
    aiEscalateOnHotLead: boolean;
    aiEscalateOnHandoff: boolean;
    aiHandoffMessage: string | null;
    aiKnowledgeBase: string | null;
  }>;

  if (body.aiMaxTurns != null && (body.aiMaxTurns < 1 || body.aiMaxTurns > 50)) {
    return jsonError("aiMaxTurns должно быть 1-50", 400);
  }
  if (body.aiSystemPrompt != null && body.aiSystemPrompt.length > 8000) {
    return jsonError("Промпт слишком длинный (макс 8000 символов)", 400);
  }
  if (body.aiKnowledgeBase != null && body.aiKnowledgeBase.length > 10000) {
    return jsonError("База знаний слишком длинная (макс 10000 символов)", 400);
  }

  const updated = await prisma.wAInstance.update({
    where: { id },
    data: {
      ...(body.aiEnabled !== undefined && { aiEnabled: body.aiEnabled }),
      ...(body.aiModel !== undefined && { aiModel: body.aiModel }),
      ...(body.aiSystemPrompt !== undefined && { aiSystemPrompt: body.aiSystemPrompt }),
      ...(body.aiBusinessName !== undefined && { aiBusinessName: body.aiBusinessName }),
      ...(body.aiGreeting !== undefined && { aiGreeting: body.aiGreeting }),
      ...(body.aiMaxTurns !== undefined && { aiMaxTurns: body.aiMaxTurns }),
      ...(body.aiOnlyDuringHrs !== undefined && { aiOnlyDuringHrs: body.aiOnlyDuringHrs }),
      ...(body.aiWorkStartHr !== undefined && { aiWorkStartHr: body.aiWorkStartHr }),
      ...(body.aiWorkEndHr !== undefined && { aiWorkEndHr: body.aiWorkEndHr }),
      ...(body.aiEscalateOnHotLead !== undefined && { aiEscalateOnHotLead: body.aiEscalateOnHotLead }),
      ...(body.aiEscalateOnHandoff !== undefined && { aiEscalateOnHandoff: body.aiEscalateOnHandoff }),
      ...(body.aiHandoffMessage !== undefined && { aiHandoffMessage: body.aiHandoffMessage }),
      ...(body.aiKnowledgeBase !== undefined && { aiKnowledgeBase: body.aiKnowledgeBase }),
    },
  });

  return NextResponse.json({ ok: true, bot: pickBot(updated) });
}

type InstanceRow = {
  aiEnabled: boolean;
  aiModel: string;
  aiSystemPrompt: string | null;
  aiBusinessName: string | null;
  aiGreeting: string | null;
  aiMaxTurns: number;
  aiOnlyDuringHrs: boolean;
  aiWorkStartHr: number | null;
  aiWorkEndHr: number | null;
  aiEscalateOnHotLead: boolean;
  aiEscalateOnHandoff: boolean;
  aiHandoffMessage: string | null;
  aiKnowledgeBase: string | null;
};

function pickBot(i: InstanceRow) {
  return {
    aiEnabled: i.aiEnabled,
    aiModel: i.aiModel,
    aiSystemPrompt: i.aiSystemPrompt,
    aiBusinessName: i.aiBusinessName,
    aiGreeting: i.aiGreeting,
    aiMaxTurns: i.aiMaxTurns,
    aiOnlyDuringHrs: i.aiOnlyDuringHrs,
    aiWorkStartHr: i.aiWorkStartHr,
    aiWorkEndHr: i.aiWorkEndHr,
    aiEscalateOnHotLead: i.aiEscalateOnHotLead,
    aiEscalateOnHandoff: i.aiEscalateOnHandoff,
    aiHandoffMessage: i.aiHandoffMessage,
    aiKnowledgeBase: i.aiKnowledgeBase,
  };
}
