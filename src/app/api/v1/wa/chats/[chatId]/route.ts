import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiRequest, jsonError } from "@/lib/wa-api-helpers";

export async function GET(req: NextRequest, ctx: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await ctx.params;
  const authed = await authenticateApiRequest(req);
  if (!authed) return jsonError("Unauthorized", 401);

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { instance: true },
  });
  if (!chat || chat.instance.tenantId !== authed.tenantId) {
    return jsonError("Chat not found", 404);
  }

  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Mark as read
  await prisma.chat.update({ where: { id: chatId }, data: { unread: 0 } });

  return NextResponse.json({
    chat: {
      id: chat.id,
      remoteJid: chat.remoteJid,
      phoneNumber: chat.phoneNumber,
      name: chat.name,
      instanceId: chat.instanceId,
      aiPaused: chat.instance.aiPausedChats.includes(chat.remoteJid),
    },
    messages: messages.map((m) => ({
      id: m.id,
      fromMe: m.fromMe,
      text: m.text,
      status: m.status,
      createdAt: m.createdAt,
    })),
  });
}
