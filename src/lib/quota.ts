import { prisma } from "./prisma";
import { isActivePlan, planConfig } from "./plans";

export type QuotaCheck =
  | { ok: true }
  | { ok: false; reason: "PLAN_EXPIRED"; message: string }
  | { ok: false; reason: "INSTANCE_LIMIT"; message: string }
  | { ok: false; reason: "TENANT_NOT_FOUND"; message: string };

export async function checkTenantQuota(tenantId: string): Promise<QuotaCheck> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return { ok: false, reason: "TENANT_NOT_FOUND", message: "Аккаунт не найден" };
  }

  if (!isActivePlan(tenant.plan, tenant.currentPeriodEnd)) {
    return {
      ok: false,
      reason: "PLAN_EXPIRED",
      message: "Подписка истекла. Активируйте план чтобы продолжить.",
    };
  }

  return { ok: true };
}

export async function checkInstanceCreateQuota(tenantId: string): Promise<QuotaCheck> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return { ok: false, reason: "TENANT_NOT_FOUND", message: "Аккаунт не найден" };
  }

  if (!isActivePlan(tenant.plan, tenant.currentPeriodEnd)) {
    return {
      ok: false,
      reason: "PLAN_EXPIRED",
      message: "Подписка истекла",
    };
  }

  const cfg = planConfig(tenant.plan, tenant.currentPeriodEnd);
  const count = await prisma.wAInstance.count({ where: { tenantId } });
  if (count >= cfg.maxInstances) {
    return {
      ok: false,
      reason: "INSTANCE_LIMIT",
      message: `Достигнут лимит номеров (${cfg.maxInstances}) на тарифе ${cfg.name}`,
    };
  }

  return { ok: true };
}
