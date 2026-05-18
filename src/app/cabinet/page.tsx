import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentTenantUser } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/cabinet/logout-button";
import { Key, Settings as SettingsIcon, Plus, Bot, CreditCard } from "lucide-react";
import { effectivePlan, planConfig, daysLeft } from "@/lib/plans";

export default async function CabinetHome() {
  const user = await getCurrentTenantUser();
  if (!user) redirect("/cabinet/login");

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  const instances = await prisma.wAInstance.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
  });

  const active = effectivePlan(tenant!.plan, tenant!.currentPeriodEnd);
  const cfg = planConfig(tenant!.plan, tenant!.currentPeriodEnd);
  const left = daysLeft(tenant!.currentPeriodEnd);
  const showWarning = active === "EXPIRED" || (active === "TRIAL" && left <= 1);

  const statusColor: Record<string, string> = {
    PENDING: "text-amber-400",
    QR_READY: "text-blue-400",
    CONNECTING: "text-blue-400",
    CONNECTED: "text-green-400",
    DISCONNECTED: "text-zinc-400",
    LOGGED_OUT: "text-orange-400",
    BANNED: "text-red-400",
  };

  const statusLabel: Record<string, string> = {
    PENDING: "Ожидает",
    QR_READY: "QR готов",
    CONNECTING: "Подключение",
    CONNECTED: "Подключён",
    DISCONNECTED: "Отключён",
    LOGGED_OUT: "Нужен новый QR",
    BANNED: "Заблокирован",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Jamiwa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user.tenantName} · {user.email} ·{" "}
            <span className="uppercase tracking-wide">{cfg.name}</span>
          </p>
        </div>
        <LogoutButton />
      </header>

      {showWarning && (
        <Link
          href="/cabinet/billing"
          className={`block rounded-2xl p-4 mb-6 transition ${
            active === "EXPIRED"
              ? "bg-red-500/10 border border-red-500/30 hover:bg-red-500/15"
              : "bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/15"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                {active === "EXPIRED"
                  ? "⚠️ Ваш план истёк"
                  : `⏰ Триал заканчивается ${left === 0 ? "сегодня" : "завтра"}`}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {active === "EXPIRED"
                  ? "Активируйте подписку чтобы продолжить использовать сервис"
                  : "Активируйте план чтобы не потерять доступ"}
              </div>
            </div>
            <span className="text-sm font-medium">Активировать →</span>
          </div>
        </Link>
      )}

      <nav className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Link
          href="/cabinet/billing"
          className="glass rounded-2xl p-4 flex items-center gap-3 hover:bg-muted/30 transition"
        >
          <CreditCard className="text-brand-blue" size={20} />
          <div>
            <div className="font-medium">Подписка</div>
            <div className="text-xs text-muted-foreground">
              {cfg.name}
              {active !== "EXPIRED" && left > 0 ? ` · ${left} дн.` : ""}
            </div>
          </div>
        </Link>
        <Link
          href="/cabinet/api-keys"
          className="glass rounded-2xl p-4 flex items-center gap-3 hover:bg-muted/30 transition"
        >
          <Key className="text-brand-blue" size={20} />
          <div>
            <div className="font-medium">API ключи</div>
            <div className="text-xs text-muted-foreground">Документация</div>
          </div>
        </Link>
        <Link
          href="/cabinet/settings"
          className="glass rounded-2xl p-4 flex items-center gap-3 hover:bg-muted/30 transition"
        >
          <SettingsIcon className="text-brand-blue" size={20} />
          <div>
            <div className="font-medium">Настройки</div>
            <div className="text-xs text-muted-foreground">Telegram, профиль</div>
          </div>
        </Link>
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <Bot className="text-brand-blue" size={20} />
          <div>
            <div className="font-medium">Номеров</div>
            <div className="text-xs text-muted-foreground">
              {instances.length}/{cfg.maxInstances}
            </div>
          </div>
        </div>
      </nav>

      <section className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Ваши номера WhatsApp</h2>
          <Link
            href="/cabinet/wa/instances/new"
            className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
          >
            <Plus size={14} /> Подключить новый
          </Link>
        </div>

        {instances.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-muted-foreground mb-4">У вас пока нет подключённых номеров</p>
            <Link
              href="/cabinet/wa/instances/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-blue/10 text-brand-blue px-4 py-2 text-sm hover:bg-brand-blue/20 transition"
            >
              <Plus size={14} /> Подключить WhatsApp
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border/30">
            {instances.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/cabinet/wa/instances/${i.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/20 -mx-2 px-2 rounded-lg transition"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {i.label || i.phoneNumber || "Без названия"}
                      {i.aiEnabled && (
                        <span
                          title="AI-бот включён"
                          className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue"
                        >
                          <Bot size={10} /> AI
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {i.phoneNumber ? `+${i.phoneNumber}` : "Не подключён"}
                    </div>
                  </div>
                  <span className={`text-xs ${statusColor[i.status]}`}>{statusLabel[i.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
