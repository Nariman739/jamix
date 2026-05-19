import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantUser } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";

type Config = {
  businessName?: string;
  botName?: string | null;
  systemPrompt: string;
  knowledgeBase?: string;
  escalateOnHotLead?: boolean;
  escalateOnHandoff?: boolean;
  handoffMessage?: string;
};

export async function POST(req: NextRequest) {
  const user = await getCurrentTenantUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    config?: Config;
    instanceId?: string;
  };
  const cfg = body.config;
  if (!cfg || !cfg.systemPrompt) {
    return NextResponse.json({ error: "config.systemPrompt required" }, { status: 400 });
  }

  // Truncate to safe limits
  const systemPrompt = cfg.systemPrompt.slice(0, 8000);
  const knowledgeBase = (cfg.knowledgeBase || "").slice(0, 10000) || null;
  const businessName = (cfg.businessName || "").slice(0, 100) || null;
  const handoffMessage = (cfg.handoffMessage || "").slice(0, 300) || null;
  const label = businessName ? `${businessName}` : "Мой WhatsApp";

  const data = {
    aiEnabled: true,
    aiSystemPrompt: systemPrompt,
    aiBusinessName: businessName,
    aiKnowledgeBase: knowledgeBase,
    aiEscalateOnHotLead: cfg.escalateOnHotLead !== false,
    aiEscalateOnHandoff: cfg.escalateOnHandoff !== false,
    aiHandoffMessage: handoffMessage,
  };

  // If instanceId provided — update; otherwise find first or create new
  let instance;
  if (body.instanceId) {
    instance = await prisma.wAInstance.findFirst({
      where: { id: body.instanceId, tenantId: user.tenantId },
    });
    if (!instance) return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    instance = await prisma.wAInstance.update({
      where: { id: instance.id },
      data,
    });
  } else {
    // Reuse first existing instance or create one
    instance = await prisma.wAInstance.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "asc" },
    });
    if (instance) {
      instance = await prisma.wAInstance.update({
        where: { id: instance.id },
        data,
      });
    } else {
      instance = await prisma.wAInstance.create({
        data: {
          tenantId: user.tenantId,
          label,
          ...data,
        },
      });
    }
  }

  return NextResponse.json({
    instanceId: instance.id,
    needsConnection: instance.status !== "CONNECTED",
  });
}
