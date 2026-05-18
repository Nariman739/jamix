import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { days, note } = (await req.json()) as { days: number; note?: string };

  if (days < 1 || days > 365) {
    return NextResponse.json({ error: "Invalid days" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  // Extend from current end (if future) or from now (if expired)
  const base =
    tenant.currentPeriodEnd && tenant.currentPeriodEnd.getTime() > Date.now()
      ? tenant.currentPeriodEnd
      : new Date();
  const newEnd = new Date(base);
  newEnd.setDate(newEnd.getDate() + days);

  const cfg = PLANS[tenant.plan as keyof typeof PLANS];
  const proratedAmount = Math.round((cfg.priceKzt * days) / 30);

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id },
      data: { currentPeriodEnd: newEnd },
    }),
    prisma.payment.create({
      data: {
        tenantId: id,
        amount: proratedAmount,
        plan: tenant.plan,
        durationDays: days,
        method: "MANUAL",
        status: "CONFIRMED",
        note: note || `Продление на ${days} дней`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
