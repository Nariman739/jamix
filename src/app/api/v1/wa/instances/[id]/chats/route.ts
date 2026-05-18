import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstance } from "@/lib/wa-api-helpers";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  const chats = await prisma.chat.findMany({
    where: { instanceId: r.instance.id },
    orderBy: [{ lastMsgAt: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { text: true, fromMe: true, createdAt: true },
      },
    },
  });

  const aiPaused = new Set(r.instance.aiPausedChats);

  return NextResponse.json({
    chats: chats.map((c) => ({
      id: c.id,
      remoteJid: c.remoteJid,
      phoneNumber: c.phoneNumber,
      name: c.name,
      lastMsgAt: c.lastMsgAt,
      unread: c.unread,
      lastMessage: c.messages[0] || null,
      aiPaused: aiPaused.has(c.remoteJid),
    })),
  });
}
