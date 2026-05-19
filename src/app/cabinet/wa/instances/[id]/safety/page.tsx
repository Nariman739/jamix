import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, Clock, ShieldOff } from "lucide-react";
import { getCurrentTenantUser } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import { InstanceTabs } from "@/components/cabinet/instance-tabs";
import { SafetySettings } from "@/components/cabinet/safety-settings";
import { DncList } from "@/components/cabinet/dnc-list";

function warmupStage(connectedAt: Date | null): {
  stage: "new" | "warming" | "ready" | "never";
  hours: number;
  hoursLeft: number;
  dailyLimit: number | null;
} {
  if (!connectedAt) return { stage: "never", hours: 0, hoursLeft: 0, dailyLimit: null };
  const hours = (Date.now() - connectedAt.getTime()) / 3_600_000;
  if (hours < 24) return { stage: "new", hours, hoursLeft: 24 - hours, dailyLimit: 50 };
  if (hours < 72) return { stage: "warming", hours, hoursLeft: 72 - hours, dailyLimit: 200 };
  return { stage: "ready", hours, hoursLeft: 0, dailyLimit: null };
}

export default async function SafetyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentTenantUser();
  if (!user) redirect("/cabinet/login");

  const instance = await prisma.wAInstance.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!instance) notFound();

  const stage = warmupStage(instance.connectedAt);

  // Cold outreach sent today (chats without incoming msg)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const chatsWithIncoming = await prisma.chat.findMany({
    where: { instanceId: id, messages: { some: { fromMe: false } } },
    select: { id: true },
  });
  const chatsWithIncomingIds = chatsWithIncoming.map((c) => c.id);
  const todayCold = await prisma.message.count({
    where: {
      instanceId: id,
      fromMe: true,
      createdAt: { gte: startOfDay },
      chatId: chatsWithIncomingIds.length
        ? { notIn: chatsWithIncomingIds }
        : undefined,
    },
  });

  const blockedContacts = await prisma.blockedContact.findMany({
    where: { instanceId: id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <Link
        href="/cabinet"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft size={14} /> Назад к списку
      </Link>

      <InstanceTabs id={instance.id} active="safety" />

      <header className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="text-brand-blue" size={22} />
          Защита от блокировки
        </h1>
        <p className="text-sm text-muted-foreground">
          Незаметная защита от бана WhatsApp: мягкий ритм отправки, прогрев нового
          номера, авто-отписка по запросу клиента и алерты при массовых рассылках.
        </p>
      </header>

      {/* Warm-up status */}
      <section className="glass rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Clock size={16} className="text-brand-blue" /> Прогрев номера
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Лимит распространяется только на cold-сообщения тем, кто <b>не писал первым</b>.
              На ответы клиентам лимита нет.
            </p>
          </div>
          <StageBadge stage={stage.stage} />
        </div>

        {stage.stage === "never" && (
          <p className="text-sm text-muted-foreground">Номер ещё не подключен.</p>
        )}

        {stage.stage !== "never" && stage.stage !== "ready" && (
          <div className="space-y-3">
            <div className="text-sm">
              Лимит на сегодня (cold-сообщения):{" "}
              <b>
                {todayCold}/{stage.dailyLimit ?? "∞"}
              </b>
            </div>
            <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
              <div
                className="h-full bg-brand-blue transition-all"
                style={{
                  width: stage.dailyLimit
                    ? `${Math.min(100, (todayCold / stage.dailyLimit) * 100)}%`
                    : "0%",
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Прогрев закончится через{" "}
              <b>
                {stage.hoursLeft >= 1
                  ? `${Math.ceil(stage.hoursLeft)} ч`
                  : `${Math.ceil(stage.hoursLeft * 60)} мин`}
              </b>
              .
            </p>
          </div>
        )}

        {stage.stage === "ready" && (
          <p className="text-sm text-emerald-300">
            ✓ Номер прогрет (более 72 часов с подключения). Лимитов на отправку нет.
          </p>
        )}
      </section>

      {/* Safety settings */}
      <section className="glass rounded-2xl p-5">
        <h2 className="font-semibold mb-2">Режимы работы</h2>
        <SafetySettings
          instanceId={id}
          initial={{ onlyReplies: instance.onlyReplies }}
        />
      </section>

      {/* DNC list */}
      <section className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <ShieldOff size={16} className="text-rose-400" /> Не писать (DNC)
          </h2>
          <span className="text-xs text-muted-foreground">
            {blockedContacts.length} контакт{blockedContacts.length === 1 ? "" : "ов"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Когда клиент пишет «стоп», «не пишите», «отпишите» — мы автоматически
          заносим его сюда и больше не отправляем ему сообщения. Это защита от
          жалоб в WhatsApp и юридическое требование закона РК о ПДн.
        </p>
        <DncList
          instanceId={id}
          contacts={blockedContacts.map((c) => ({
            id: c.id,
            remoteJid: c.remoteJid,
            phoneNumber: c.phoneNumber,
            reason: c.reason,
            trigger: c.trigger,
            createdAt: c.createdAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}

function StageBadge({ stage }: { stage: "new" | "warming" | "ready" | "never" }) {
  const config = {
    new: { text: "Новый (день 1)", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
    warming: { text: "Прогрев (день 2-3)", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
    ready: { text: "Прогрет", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
    never: { text: "Не подключен", cls: "bg-muted/40 text-muted-foreground border-border/40" },
  }[stage];
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${config.cls}`}>
      {config.text}
    </span>
  );
}
