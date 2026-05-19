import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstance, jsonError } from "@/lib/wa-api-helpers";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  const i = r.instance;
  return NextResponse.json({
    connectedAt: i.connectedAt,
    onlyReplies: i.onlyReplies,
    bulkPausedUntil: i.bulkPausedUntil,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  const body = (await req.json().catch(() => ({}))) as Partial<{
    onlyReplies: boolean;
    clearBulkPause: boolean;
  }>;

  const data: { onlyReplies?: boolean; bulkPausedUntil?: Date | null } = {};
  if (typeof body.onlyReplies === "boolean") data.onlyReplies = body.onlyReplies;
  if (body.clearBulkPause) data.bulkPausedUntil = null;

  if (Object.keys(data).length === 0) {
    return jsonError("nothing to update", 400);
  }

  const updated = await prisma.wAInstance.update({
    where: { id },
    data,
    select: { onlyReplies: true, bulkPausedUntil: true },
  });

  return NextResponse.json(updated);
}
