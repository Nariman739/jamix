import type { Plan } from "@/generated/prisma/enums";

export type PlanKey = "TRIAL" | "STARTER" | "PRO" | "BUSINESS" | "EXPIRED";

export const TRIAL_DAYS = 3;

export type PlanConfig = {
  key: PlanKey;
  name: string;
  priceKzt: number;             // 0 for TRIAL/EXPIRED
  maxInstances: number;         // hard cap on WA numbers
  aiDailyMessageLimit: number;  // per-instance AI replies per 24h (Infinity allowed)
  features: string[];
};

export const PLANS: Record<PlanKey, PlanConfig> = {
  TRIAL: {
    key: "TRIAL",
    name: "Триал",
    priceKzt: 0,
    maxInstances: 1,
    aiDailyMessageLimit: 100,
    features: ["1 номер", "AI до 100 сообщений/день", "3 дня бесплатно"],
  },
  STARTER: {
    key: "STARTER",
    name: "Старт",
    priceKzt: 4990,
    maxInstances: 1,
    aiDailyMessageLimit: 200,
    features: ["1 номер", "AI до 200 сообщений/день", "База знаний", "Эскалация"],
  },
  PRO: {
    key: "PRO",
    name: "Про",
    priceKzt: 9990,
    maxInstances: 1,
    aiDailyMessageLimit: 2000,
    features: ["1 номер", "AI без лимита (Fair Use 2000/день)", "Все фичи", "Webhook + API"],
  },
  BUSINESS: {
    key: "BUSINESS",
    name: "Бизнес",
    priceKzt: 24990,
    maxInstances: 3,
    aiDailyMessageLimit: 5000,
    features: ["3 номера", "AI 5000/день на номер", "Приоритет поддержки", "Кастом-интеграции"],
  },
  EXPIRED: {
    key: "EXPIRED",
    name: "План истёк",
    priceKzt: 0,
    maxInstances: 0,
    aiDailyMessageLimit: 0,
    features: [],
  },
};

// Effective plan: returns EXPIRED if currentPeriodEnd is in the past, regardless of stored plan
export function effectivePlan(plan: Plan, currentPeriodEnd: Date | null): PlanKey {
  if (!currentPeriodEnd) return plan as PlanKey;
  if (currentPeriodEnd.getTime() < Date.now()) return "EXPIRED";
  return plan as PlanKey;
}

export function planConfig(plan: Plan, currentPeriodEnd: Date | null): PlanConfig {
  return PLANS[effectivePlan(plan, currentPeriodEnd)];
}

export function isActivePlan(plan: Plan, currentPeriodEnd: Date | null): boolean {
  return effectivePlan(plan, currentPeriodEnd) !== "EXPIRED";
}

export function daysLeft(currentPeriodEnd: Date | null): number {
  if (!currentPeriodEnd) return 0;
  const ms = currentPeriodEnd.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
