import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentTenantUser } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import { effectivePlan, planConfig, daysLeft, PLANS } from "@/lib/plans";
import { CheckCircle2 } from "lucide-react";
import { OrderPlanButton } from "@/components/cabinet/order-plan-button";

export default async function BillingPage() {
  const user = await getCurrentTenantUser();
  if (!user) redirect("/cabinet/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    include: {
      payments: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!tenant) redirect("/cabinet/login");

  const active = effectivePlan(tenant.plan, tenant.currentPeriodEnd);
  const cfg = planConfig(tenant.plan, tenant.currentPeriodEnd);
  const left = daysLeft(tenant.currentPeriodEnd);

  const orderablePlans = [PLANS.STARTER, PLANS.PRO, PLANS.BUSINESS];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link href="/cabinet" className="text-sm text-muted-foreground hover:text-foreground">
            ← Кабинет
          </Link>
          <h1 className="text-2xl font-bold mt-2">Подписка</h1>
        </div>
      </header>

      <section className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase text-muted-foreground tracking-wide">Текущий план</div>
            <div className="text-2xl font-bold mt-1">{cfg.name}</div>
            <div className="text-sm text-muted-foreground mt-2">
              {active === "EXPIRED"
                ? "⚠️ Доступ закрыт. Активируйте план чтобы продолжить."
                : active === "TRIAL"
                  ? `Триал ${left > 0 ? `(осталось ${left} дн.)` : "(заканчивается сегодня)"}`
                  : tenant.currentPeriodEnd
                    ? `Активно до ${new Intl.DateTimeFormat("ru-RU", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }).format(tenant.currentPeriodEnd)}`
                    : "—"}
            </div>
          </div>
          <div
            className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
              active === "EXPIRED"
                ? "bg-red-500/15 text-red-400"
                : active === "TRIAL"
                  ? "bg-yellow-500/15 text-yellow-400"
                  : "bg-emerald-500/15 text-emerald-400"
            }`}
          >
            {active === "EXPIRED" ? "Истёк" : active === "TRIAL" ? "Триал" : "Активен"}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4">
          {active === "EXPIRED" || active === "TRIAL" ? "Выберите план" : "Изменить план"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {orderablePlans.map((p) => {
            const isCurrent = tenant.plan === p.key && active !== "EXPIRED";
            return (
              <div
                key={p.key}
                className={`glass rounded-2xl p-6 flex flex-col ${
                  isCurrent ? "ring-2 ring-brand-blue/50" : ""
                }`}
              >
                <div className="font-bold text-lg">{p.name}</div>
                <div className="text-3xl font-bold gradient-text my-3">
                  {p.priceKzt.toLocaleString("ru-RU")} ₸
                  <span className="text-xs text-muted-foreground font-normal">/мес</span>
                </div>
                <ul className="text-sm space-y-2 mb-5 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-muted-foreground">
                      <CheckCircle2 size={14} className="text-brand-blue mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="text-center text-sm text-muted-foreground py-2">Текущий план</div>
                ) : (
                  <OrderPlanButton plan={p.key} priceKzt={p.priceKzt} planName={p.name} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass rounded-2xl p-6 space-y-3">
        <h2 className="font-bold">Как оплатить</h2>
        <ol className="text-sm space-y-2 list-decimal pl-5 text-muted-foreground">
          <li>Нажмите кнопку <strong className="text-foreground">"Оплатить"</strong> на нужном тарифе.</li>
          <li>Откроется инструкция с реквизитами Каспи + сумма.</li>
          <li>Переведите в Каспи и сообщите нам (откроется WhatsApp или Telegram).</li>
          <li>Подписка активируется в течение <strong className="text-foreground">1-2 часов</strong> в рабочее время.</li>
        </ol>
        <p className="text-xs text-muted-foreground pt-2">
          Скоро добавим автоматическую оплату картой. Пока — ручной режим, ради надёжности.
        </p>
      </section>

      {tenant.payments.length > 0 && (
        <section className="glass rounded-2xl p-6">
          <h2 className="font-bold mb-4">История платежей</h2>
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left py-2">Дата</th>
                <th className="text-left py-2">План</th>
                <th className="text-left py-2">Сумма</th>
                <th className="text-left py-2">Статус</th>
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
                  <td className="py-2 text-xs">
                    {p.status === "CONFIRMED" ? (
                      <span className="text-emerald-400">Оплачен</span>
                    ) : (
                      <span className="text-muted-foreground">{p.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
