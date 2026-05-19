// Подсчёт использования AI-ответов для текущего тенанта.
import { prisma } from "./prisma";
import { planConfig, effectivePlan } from "./plans";
import type { Plan } from "@/generated/prisma/enums";

export type UsageSnapshot = {
  todayCount: number;
  dailyLimit: number;
  pct: number; // 0-100
  planKey: ReturnType<typeof effectivePlan>;
  planName: string;
};

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getTenantUsage(
  tenantId: string,
  plan: Plan,
  currentPeriodEnd: Date | null,
): Promise<UsageSnapshot> {
  const since = startOfTodayUtc();
  const todayCount = await prisma.message.count({
    where: {
      instance: { tenantId },
      fromMe: true,
      createdAt: { gte: since },
    },
  });
  const cfg = planConfig(plan, currentPeriodEnd);
  const dailyLimit = cfg.aiDailyMessageLimit;
  const pct = dailyLimit > 0 ? Math.min(100, Math.round((todayCount / dailyLimit) * 100)) : 100;
  return {
    todayCount,
    dailyLimit,
    pct,
    planKey: effectivePlan(plan, currentPeriodEnd),
    planName: cfg.name,
  };
}
