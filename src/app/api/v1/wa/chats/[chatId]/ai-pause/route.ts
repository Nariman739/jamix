import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest, jsonError } from "@/lib/wa-api-helpers";

export async function POST(req: NextRequest, ctx: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await ctx.params;
  const authed = await authenticateApiRequest(req);
  if (!authed) return jsonError("Unauthorized", 401);

  const body = (await req.json().catch(() => ({}))) as { paused?: boolean };

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { instance: true },
  });
  if (!chat || chat.instance.tenantId !== authed.tenantId) {
    return jsonError("Chat not found", 404);
  }

  const current = new Set(chat.instance.aiPausedChats);
  if (body.paused) current.add(chat.remoteJid);
  else current.delete(chat.remoteJid);

  await prisma.wAInstance.update({
    where: { id: chat.instanceId },
    data: { aiPausedChats: [...current] },
  });

  return NextResponse.json({ ok: true, aiPaused: body.paused === true });
}
