import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstance } from "@/lib/wa-api-helpers";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  return NextResponse.json({
    instance: {
      id: r.instance.id,
      label: r.instance.label,
      phoneNumber: r.instance.phoneNumber,
      status: r.instance.status,
      webhookUrl: r.instance.webhookUrl,
      lastSeenAt: r.instance.lastSeenAt,
      createdAt: r.instance.createdAt,
    },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  // Mark for cleanup — worker will pick up via status transition.
  // For MVP we just hard-delete; worker reconnect logic checks DB on each tick.
  await prisma.wAInstance.delete({ where: { id: r.instance.id } });
  return NextResponse.json({ ok: true });
}
