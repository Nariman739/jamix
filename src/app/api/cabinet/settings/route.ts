import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantUser, generateApiKey } from "@/lib/tenant-auth";

export async function GET() {
  const user = await getCurrentTenantUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      apiKeyHint: tenant.apiKeyHint,
      telegramChatId: tenant.telegramChatId,
      createdAt: tenant.createdAt,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentTenantUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<{
    name: string;
    telegramChatId: string | null;
  }>;

  const updated = await prisma.tenant.update({
    where: { id: user.tenantId },
    data: {
      ...(body.name !== undefined && body.name.trim() && { name: body.name.trim() }),
      ...(body.telegramChatId !== undefined && {
        telegramChatId: body.telegramChatId || null,
      }),
    },
  });

  return NextResponse.json({ ok: true, telegramChatId: updated.telegramChatId });
}
