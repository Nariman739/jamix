import { getCurrentAdmin } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { effectivePlan, planConfig, daysLeft, PLANS } from "@/lib/plans";
import { TenantBillingPanel } from "@/components/dashboard/tenant-billing-panel";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/dashboard/login");

  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      instances: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!tenant) notFound();

  const active = effectivePlan(tenant.plan, tenant.currentPeriodEnd);
  const cfg = planConfig(tenant.plan, tenant.currentPeriodEnd);
  const left = daysLeft(tenant.currentPeriodEnd);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/tenants"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Все клиенты
          </Link>
          <h1 className="text-3xl font-bold mt-2">{tenant.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ID: <code className="text-xs">{tenant.id}</code>
          </p>
        </div>
        <div className="text-right">
          <div
            className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${
              active === "EXPIRED"
                ? "bg-red-500/15 text-red-400"
                : active === "TRIAL"
                  ? "bg-yellow-500/15 text-yellow-400"
                  : "bg-emerald-500/15 text-emerald-400"
            }`}
          >
            {cfg.name}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {active === "EXPIRED"
              ? "Доступ закрыт"
              : left > 0
                ? `Активно ещё ${left} дн.`
                : "—"}
          </div>
        </div>
      </div>

      <TenantBillingPanel
        tenantId={tenant.id}
        currentPlan={tenant.plan}
        currentPeriodEnd={tenant.currentPeriodEnd?.toISOString() || null}
        plans={Object.values(PLANS).filter((p) => p.key !== "EXPIRED" && p.key !== "TRIAL")}
      />

      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold mb-4">Пользователи аккаунта</h2>
        <div className="space-y-2">
          {tenant.users.map((u) => (
            <div
              key={u.id}
              className="flex justify-between items-center text-sm px-3 py-2 rounded-lg hover:bg-muted/30"
            >
              <div>
                <div>{u.email}</div>
                <div className="text-xs text-muted-foreground">{u.name || "—"}</div>
              </div>
              <span className="text-xs text-muted-foreground">{u.role}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold mb-4">WhatsApp номера ({tenant.instances.length})</h2>
        {tenant.instances.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ещё не подключал ни одного.</p>
        ) : (
          <div className="space-y-2">
            {tenant.instances.map((inst) => (
              <div
                key={inst.id}
                className="flex justify-between items-center text-sm px-3 py-2 rounded-lg hover:bg-muted/30"
              >
                <div>
                  <div>{inst.label || "Без названия"}</div>
                  <div className="text-xs text-muted-foreground">
                    {inst.phoneNumber ? `+${inst.phoneNumber}` : "не привязан"}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    inst.status === "CONNECTED"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : inst.status === "BANNED"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {inst.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-bold mb-4">История платежей ({tenant.payments.length})</h2>
        {tenant.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ещё ни одного платежа.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left py-2">Дата</th>
                <th className="text-left py-2">План</th>
                <th className="text-left py-2">Сумма</th>
                <th className="text-left py-2">Метод</th>
                <th className="text-left py-2">Статус</th>
                <th className="text-left py-2">Заметка</th>
              </tr>
            </thead>
            <tbody>
              {tenant.payments.map((p) => (
                <tr key={p.id} className="border-t border-border/20">
                  <td className="py-2">
                    {new Intl.DateTimeFormat("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(p.createdAt)}
                  </td>
                  <td className="py-2">{PLANS[p.plan as keyof typeof PLANS]?.name || p.plan}</td>
                  <td className="py-2">{p.amount.toLocaleString("ru-RU")} ₸</td>
                  <td className="py-2 text-xs text-muted-foreground">{p.method}</td>
                  <td className="py-2 text-xs">{p.status}</td>
                  <td className="py-2 text-xs text-muted-foreground">{p.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
