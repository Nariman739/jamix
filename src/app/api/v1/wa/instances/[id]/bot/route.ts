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
    aiTimezone: string;
    aiWorkDays: number[];
    aiOffDaysActive: boolean;
    aiEscalateOnHotLead: boolean;
    aiEscalateOnHandoff: boolean;
    aiHandoffMessage: string | null;
    aiKnowledgeBase: string | null;
    aiLeadFields: string | null;
    aiReportGroupJid: string | null;
    aiDailyDigest: boolean;
    aiDigestHour: number;
  }>;

  if (body.aiDigestHour != null && (!Number.isInteger(body.aiDigestHour) || body.aiDigestHour < 0 || body.aiDigestHour > 23)) {
    return jsonError("Час сводки: 0-23", 400);
  }

  if (body.aiLeadFields != null && body.aiLeadFields.length > 1500) {
    return jsonError("Слишком много полей лида (макс 1500 символов)", 400);
  }
  let aiReportGroupName: string | null | undefined;
  if (body.aiReportGroupJid !== undefined) {
    if (body.aiReportGroupJid === null || body.aiReportGroupJid === "") {
      body.aiReportGroupJid = null;
      aiReportGroupName = null;
    } else {
      if (!/^[0-9-]+@g\.us$/.test(body.aiReportGroupJid)) {
        return jsonError("Группа должна быть выбрана из списка", 400);
      }
      const groups = (r.instance.groupsCache as { jid: string; name: string }[] | null) ?? [];
      aiReportGroupName = groups.find((g) => g.jid === body.aiReportGroupJid)?.name ?? null;
    }
  }

  if (body.aiTimezone != null) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: body.aiTimezone });
    } catch {
      return jsonError("Неизвестная таймзона", 400);
    }
  }
  if (body.aiWorkDays != null) {
    if (!Array.isArray(body.aiWorkDays) || body.aiWorkDays.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) {
      return jsonError("aiWorkDays: дни недели 1-7", 400);
    }
    body.aiWorkDays = Array.from(new Set(body.aiWorkDays)).sort();
  }

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
      ...(body.aiTimezone !== undefined && { aiTimezone: body.aiTimezone }),
      ...(body.aiWorkDays !== undefined && { aiWorkDays: body.aiWorkDays }),
      ...(body.aiOffDaysActive !== undefined && { aiOffDaysActive: body.aiOffDaysActive }),
      ...(body.aiEscalateOnHotLead !== undefined && { aiEscalateOnHotLead: body.aiEscalateOnHotLead }),
      ...(body.aiEscalateOnHandoff !== undefined && { aiEscalateOnHandoff: body.aiEscalateOnHandoff }),
      ...(body.aiHandoffMessage !== undefined && { aiHandoffMessage: body.aiHandoffMessage }),
      ...(body.aiKnowledgeBase !== undefined && { aiKnowledgeBase: body.aiKnowledgeBase }),
      ...(body.aiLeadFields !== undefined && { aiLeadFields: body.aiLeadFields || null }),
      ...(body.aiReportGroupJid !== undefined && { aiReportGroupJid: body.aiReportGroupJid, aiReportGroupName }),
      ...(body.aiDailyDigest !== undefined && { aiDailyDigest: body.aiDailyDigest }),
      ...(body.aiDigestHour !== undefined && { aiDigestHour: body.aiDigestHour }),
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
  aiTimezone: string;
  aiWorkDays: number[];
  aiOffDaysActive: boolean;
  aiEscalateOnHotLead: boolean;
  aiEscalateOnHandoff: boolean;
  aiHandoffMessage: string | null;
  aiKnowledgeBase: string | null;
  aiLeadFields: string | null;
  aiReportGroupJid: string | null;
  aiReportGroupName: string | null;
  aiDailyDigest: boolean;
  aiDigestHour: number;
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
    aiTimezone: i.aiTimezone,
    aiWorkDays: i.aiWorkDays,
    aiOffDaysActive: i.aiOffDaysActive,
    aiEscalateOnHotLead: i.aiEscalateOnHotLead,
    aiEscalateOnHandoff: i.aiEscalateOnHandoff,
    aiHandoffMessage: i.aiHandoffMessage,
    aiKnowledgeBase: i.aiKnowledgeBase,
    aiLeadFields: i.aiLeadFields,
    aiReportGroupJid: i.aiReportGroupJid,
    aiReportGroupName: i.aiReportGroupName,
    aiDailyDigest: i.aiDailyDigest,
    aiDigestHour: i.aiDigestHour,
  };
}
