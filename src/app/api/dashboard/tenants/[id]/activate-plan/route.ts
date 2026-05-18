import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS, type PlanKey } from "@/lib/plans";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { plan, durationDays, note } = (await req.json()) as {
    plan: PlanKey;
    durationDays: number;
    note?: string;
  };

  if (!PLANS[plan] || plan === "TRIAL" || plan === "EXPIRED") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (durationDays < 1 || durationDays > 365) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const newEnd = new Date();
  newEnd.setDate(newEnd.getDate() + durationDays);

  const cfg = PLANS[plan];

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id },
      data: { plan, currentPeriodEnd: newEnd },
    }),
    prisma.payment.create({
      data: {
        tenantId: id,
        amount: cfg.priceKzt,
        plan,
        durationDays,
        method: "MANUAL",
        status: "CONFIRMED",
        note: note || `Активация ${cfg.name} админом`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
