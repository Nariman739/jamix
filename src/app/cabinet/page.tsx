import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentTenantUser } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/cabinet/logout-button";
import {
  Sparkles,
  Smartphone,
  Share2,
  CreditCard,
  Settings as SettingsIcon,
  Key,
  Bot,
  ArrowRight,
  Check,
} from "lucide-react";
import { effectivePlan, planConfig, daysLeft } from "@/lib/plans";
import { getTenantUsage } from "@/lib/usage";

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
  const usage = await getTenantUsage(user.tenantId, tenant!.plan, tenant!.currentPeriodEnd);
  const usageWarning = usage.dailyLimit > 0 && usage.pct >= 80;

  // Onboarding stage
  const hasConfiguredBot = instances.some((i) => i.aiEnabled && i.aiSystemPrompt);
  const hasConnected = instances.some((i) => i.status === "CONNECTED");
  const step1Done = hasConfiguredBot;
  const step2Done = hasConnected;
  const allDone = step1Done && step2Done;
  const currentStep = !step1Done ? 1 : !step2Done ? 2 : 3;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Jamiwa</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {user.tenantName} · {user.email}
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
              : "bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">
                {active === "EXPIRED"
                  ? "⚠️ План истёк"
                  : `⏰ Триал заканчивается ${left === 0 ? "сегодня" : "завтра"}`}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {active === "EXPIRED"
                  ? "Активируйте подписку, чтобы продолжить"
                  : "Активируйте план, чтобы не потерять доступ"}
              </div>
            </div>
            <span className="text-sm font-medium whitespace-nowrap">Активировать →</span>
          </div>
        </Link>
      )}

      {/* Onboarding: 3 steps */}
      {!allDone && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Запуск за 3 шага
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StepCard
              num={1}
              title="Настроить AI-помощника"
              description="Поговори с мастером настройки — он спросит про твой бизнес и сам соберёт бота."
              icon={<Sparkles size={20} />}
              done={step1Done}
              active={currentStep === 1}
              href={
                instances[0]?.aiSystemPrompt
                  ? `/cabinet/wa/instances/${instances[0].id}/bot`
                  : "/cabinet/setup"
              }
              cta={step1Done ? "Поменять" : "Начать настройку"}
            />
            <StepCard
              num={2}
              title="Подключить WhatsApp"
              description="Отсканить QR-код в WhatsApp на телефоне — займёт 30 секунд."
              icon={<Smartphone size={20} />}
              done={step2Done}
              active={currentStep === 2 && step1Done}
              disabled={!step1Done}
              href={
                instances[0]
                  ? `/cabinet/wa/instances/${instances[0].id}`
                  : "/cabinet/wa/instances/new"
              }
              cta={step2Done ? "Управлять" : "Подключить"}
            />
            <StepCard
              num={3}
              title="Готово — пробуй!"
              description="Напиши на свой номер с другого WhatsApp — AI ответит за пару секунд."
              icon={<Share2 size={20} />}
              done={allDone}
              active={currentStep === 3}
              disabled={!step2Done}
              href={
                instances[0]
                  ? `/cabinet/wa/instances/${instances[0].id}/test`
                  : "#"
              }
              cta="Попробовать"
            />
          </div>
        </section>
      )}

      {/* WhatsApp numbers list (если уже что-то подключено) */}
      {instances.length > 0 && (
        <section className="glass rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Мои номера WhatsApp</h2>
            {instances.length < cfg.maxInstances && (
              <Link
                href="/cabinet/wa/instances/new"
                className="text-sm text-brand-blue hover:underline"
              >
                + Добавить номер
              </Link>
            )}
          </div>
          <ul className="divide-y divide-border/30">
            {instances.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/cabinet/wa/instances/${i.id}`}
                  className="flex items-center justify-between py-3 hover:bg-muted/20 -mx-2 px-2 rounded-lg transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {i.label || i.phoneNumber || "Без названия"}
                      {i.aiEnabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue">
                          AI
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {i.phoneNumber ? `+${i.phoneNumber}` : "Не подключён"}
                    </div>
                  </div>
                  <StatusBadge status={i.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Usage today */}
      {usage.dailyLimit > 0 && (
        <section className="glass rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold">AI ответов сегодня</h3>
              <p className="text-xs text-muted-foreground">
                Лимит обнуляется в 00:00 по UTC. После исчерпания бот молчит до завтра.
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${usageWarning ? "text-amber-300" : ""}`}>
                {usage.todayCount}
                <span className="text-sm text-muted-foreground"> / {usage.dailyLimit}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">{usage.planName}</div>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <div
              className={`h-full transition-all ${
                usage.pct >= 95
                  ? "bg-rose-400"
                  : usage.pct >= 80
                  ? "bg-amber-400"
                  : "bg-brand-blue"
              }`}
              style={{ width: `${usage.pct}%` }}
            />
          </div>
          {usageWarning && (
            <p className="text-xs text-amber-300 mt-2">
              {usage.pct >= 100
                ? "Лимит исчерпан — бот молчит до завтра."
                : `Использовано ${usage.pct}%. Скоро лимит — подумай о переходе на следующий тариф.`}
              {" "}
              <Link href="/cabinet/billing" className="underline">
                Сменить тариф
              </Link>
            </p>
          )}
        </section>
      )}

      {/* Secondary nav */}
      <nav className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NavCard
          icon={<CreditCard size={18} />}
          title="Тариф"
          subtitle={`${cfg.name}${active !== "EXPIRED" && left > 0 ? ` · ${left} дн.` : ""}`}
          href="/cabinet/billing"
        />
        <NavCard
          icon={<Bot size={18} />}
          title="Номеров"
          subtitle={`${instances.length} из ${cfg.maxInstances}`}
        />
        <NavCard
          icon={<Key size={18} />}
          title="API ключи"
          subtitle="Документация"
          href="/cabinet/api-keys"
        />
        <NavCard
          icon={<SettingsIcon size={18} />}
          title="Настройки"
          subtitle="Telegram, профиль"
          href="/cabinet/settings"
        />
      </nav>
    </div>
  );
}

function StepCard({
  num,
  title,
  description,
  icon,
  done,
  active,
  disabled,
  href,
  cta,
}: {
  num: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  done: boolean;
  active?: boolean;
  disabled?: boolean;
  href: string;
  cta: string;
}) {
  const ring = done
    ? "border-emerald-500/40 bg-emerald-500/5"
    : active
    ? "border-brand-blue/60 bg-brand-blue/5 shadow-lg shadow-brand-blue/10"
    : "border-border/40 bg-muted/10";

  const inner = (
    <div className={`rounded-2xl border p-5 h-full flex flex-col transition ${ring} ${disabled ? "opacity-50" : "hover:bg-muted/30"}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center ${
            done
              ? "bg-emerald-500/20 text-emerald-300"
              : active
              ? "bg-brand-blue/20 text-brand-blue"
              : "bg-muted/40 text-muted-foreground"
          }`}
        >
          {done ? <Check size={18} /> : icon}
        </div>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Шаг {num}
        </span>
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4 flex-1">{description}</p>
      <div className={`inline-flex items-center gap-1 text-sm font-medium ${
        done ? "text-emerald-300" : active ? "text-brand-blue" : "text-muted-foreground"
      }`}>
        {cta}
        {!disabled && <ArrowRight size={14} />}
      </div>
    </div>
  );

  if (disabled) return <div className="cursor-not-allowed">{inner}</div>;
  return <Link href={href}>{inner}</Link>;
}

function NavCard({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href?: string;
}) {
  const content = (
    <div className="glass rounded-2xl p-4 flex items-center gap-3 hover:bg-muted/30 transition h-full">
      <span className="text-brand-blue">{icon}</span>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { text: string; cls: string }> = {
    PENDING: { text: "Ожидает", cls: "bg-amber-500/15 text-amber-300" },
    QR_READY: { text: "Сканируйте QR", cls: "bg-sky-500/15 text-sky-300" },
    CONNECTING: { text: "Подключение", cls: "bg-sky-500/15 text-sky-300" },
    CONNECTED: { text: "● Подключён", cls: "bg-emerald-500/15 text-emerald-300" },
    DISCONNECTED: { text: "Отключён", cls: "bg-zinc-500/15 text-zinc-400" },
    LOGGED_OUT: { text: "Нужен новый QR", cls: "bg-orange-500/15 text-orange-300" },
    BANNED: { text: "Заблокирован", cls: "bg-rose-500/15 text-rose-300" },
  };
  const c = map[status] || map.PENDING;
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full ${c.cls} whitespace-nowrap`}>
      {c.text}
    </span>
  );
}
