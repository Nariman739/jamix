import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstance, jsonError } from "@/lib/wa-api-helpers";

/**
 * «Привязать заново»: номер отвязали в телефоне (401), сессия сброшена (500/411) или
 * его открыли в другом месте (440). Сбрасываем сессию и отдаём номер воркеру за новым QR.
 * Настройки бота, чаты и лиды остаются.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  if (r.instance.status === "CONNECTED") {
    return jsonError("Номер уже подключён", 400);
  }
  if (r.instance.status === "BANNED") {
    return jsonError("Номер заблокирован WhatsApp — подключите другой номер", 400);
  }

  const updated = await prisma.wAInstance.update({
    where: { id },
    data: {
      status: "PENDING",
      sessionBlob: null,
      qrCode: null,
      qrExpiresAt: null,
      workerNodeId: null,
      bannedAt: null,
    },
    select: { id: true, status: true },
  });
  return NextResponse.json({ ok: true, instance: updated });
}
