import { NextRequest, NextResponse } from "next/server";
import { requireInstance } from "@/lib/wa-api-helpers";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await requireInstance(req, id);
  if ("error" in r) return r.error;

  return NextResponse.json({
    status: r.instance.status,
    qrCode: r.instance.qrCode,
    qrExpiresAt: r.instance.qrExpiresAt,
    phoneNumber: r.instance.phoneNumber,
  });
}
