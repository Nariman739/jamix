import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { effectivePlan, planConfig, daysLeft } from "@/lib/plans";

export default async function TenantsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/dashboard/login");

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { take: 1, orderBy: { createdAt: "asc" } },
      instances: { select: { id: true, status: true, phoneNumber: true } },
      payments: { take: 1, orderBy: { createdAt: "desc" } },
    },
  });

  const totalRevenue = await prisma.payment.aggregate({
    where: { status: "CONFIRMED" },
    _sum: { amount: true },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Клиенты Jamiwa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tenants.length} аккаунт{tenants.length === 1 ? "" : "ов"} · Доход:{" "}
            {(totalRevenue._sum.amount || 0).toLocaleString("ru-RU")} ₸
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Дашборд
        </Link>
      </div>

      {tenants.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
          Пока нет ни одного клиента.
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40 text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3">Клиент</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">План</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Номера</th>
                <th className="px-4 py-3">Регистрация</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const active = effectivePlan(t.plan, t.currentPeriodEnd);
                const cfg = planConfig(t.plan, t.currentPeriodEnd);
                const left = daysLeft(t.currentPeriodEnd);
                const owner = t.users[0];
                const connected = t.instances.filter((i) => i.status === "CONNECTED").length;
                return (
                  <tr key={t.id} className="border-b border-border/20 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{owner?.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${
                          active === "EXPIRED"
                            ? "bg-red-500/15 text-red-400"
                            : active === "TRIAL"
                              ? "bg-yellow-500/15 text-yellow-400"
                              : "bg-emerald-500/15 text-emerald-400"
                        }`}
                      >
                        {cfg.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {active === "EXPIRED" ? (
                        <span className="text-red-400">истёк</span>
                      ) : left > 0 ? (
                        <span className="text-muted-foreground">{left} дн. осталось</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {connected}/{t.instances.length}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }).format(t.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/tenants/${t.id}`}
                        className="text-sm text-brand-blue hover:underline"
                      >
                        Управление →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
