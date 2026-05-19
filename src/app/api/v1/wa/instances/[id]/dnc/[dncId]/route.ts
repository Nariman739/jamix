import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstance, jsonError } from "@/lib/wa-api-helpers";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; dncId: string }> },
) {
  const { id, dncId } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  const contact = await prisma.blockedContact.findUnique({ where: { id: dncId } });
  if (!contact || contact.instanceId !== id) {
    return jsonError("not found", 404);
  }

  await prisma.blockedContact.delete({ where: { id: dncId } });
  return NextResponse.json({ ok: true });
}
