import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest, jsonError } from "@/lib/wa-api-helpers";

export async function GET(req: NextRequest) {
  const authed = await authenticateApiRequest(req);
  if (!authed) return jsonError("Unauthorized", 401);

  const instances = await prisma.wAInstance.findMany({
    where: { tenantId: authed.tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      phoneNumber: true,
      status: true,
      webhookUrl: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ instances });
}

export async function POST(req: NextRequest) {
  const authed = await authenticateApiRequest(req);
  if (!authed) return jsonError("Unauthorized", 401);

  const body = (await req.json().catch(() => ({}))) as {
    label?: string;
    webhookUrl?: string;
  };

  if (body.webhookUrl && !isSafeWebhookUrl(body.webhookUrl)) {
    return jsonError("Invalid webhook URL", 400);
  }

  // FREE plan limit: max 1 instance
  const tenant = await prisma.tenant.findUnique({ where: { id: authed.tenantId } });
  if (!tenant) return jsonError("Tenant not found", 404);

  const count = await prisma.wAInstance.count({ where: { tenantId: authed.tenantId } });
  const limit = tenant.plan === "FREE" ? 1 : tenant.plan === "PRO" ? 5 : 50;
  if (count >= limit) {
    return jsonError(
      `Достигнут лимит номеров на тарифе ${tenant.plan} (${limit}). Обновите тариф.`,
      402,
    );
  }

  const instance = await prisma.wAInstance.create({
    data: {
      tenantId: authed.tenantId,
      label: body.label || null,
      webhookUrl: body.webhookUrl || null,
      status: "PENDING",
    },
  });

  return NextResponse.json({ instance });
}

function isSafeWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0") return false;
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    if (host === "::1" || host.startsWith("fc") || host.startsWith("fd")) return false;
    return true;
  } catch {
    return false;
  }
}
