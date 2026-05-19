import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstance, jsonError } from "@/lib/wa-api-helpers";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  const items = await prisma.blockedContact.findMany({
    where: { instanceId: id },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  const body = (await req.json().catch(() => ({}))) as { phoneNumber?: string };
  const digits = (body.phoneNumber || "").replace(/[^0-9]/g, "");
  if (digits.length < 8) return jsonError("invalid phoneNumber", 400);

  const remoteJid = `${digits}@s.whatsapp.net`;
  const created = await prisma.blockedContact.upsert({
    where: { instanceId_remoteJid: { instanceId: id, remoteJid } },
    create: {
      instanceId: id,
      remoteJid,
      phoneNumber: digits,
      reason: "ADMIN_BLOCKED",
    },
    update: {},
  });

  return NextResponse.json(created);
}
