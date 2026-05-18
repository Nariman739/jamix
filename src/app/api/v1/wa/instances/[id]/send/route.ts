import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireInstance, jsonError } from "@/lib/wa-api-helpers";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  if (r.instance.status !== "CONNECTED") {
    return jsonError(`Instance is not connected (status: ${r.instance.status})`, 409);
  }

  const body = (await req.json().catch(() => ({}))) as { to?: string; text?: string };
  const to = body.to?.trim();
  const text = body.text?.trim();

  if (!to || !text) return jsonError("Both 'to' and 'text' are required", 400);
  if (!/^\d{10,15}$/.test(to.replace(/[^0-9]/g, ""))) {
    return jsonError("Invalid phone number (expected E.164 digits)", 400);
  }
  if (text.length > 4096) return jsonError("Text too long (max 4096 chars)", 400);

  const job = await prisma.outboundJob.create({
    data: {
      instanceId: r.instance.id,
      to: to.replace(/[^0-9]/g, ""),
      payload: { type: "text", text },
      status: "QUEUED",
    },
  });

  return NextResponse.json({ jobId: job.id, status: job.status });
}
