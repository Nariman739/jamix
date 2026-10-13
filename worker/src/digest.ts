// Утренняя сводка владельцу: что бот сделал за вчера. Уходит один раз в день
// в час aiDigestHour по таймзоне номера — в группу отчётов и в Telegram.
import { prisma } from "./db";
import { sendTelegram } from "./telegram";
import { localHourAndDay, LeadData } from "./ai-reply";
import { isManaged, sendText } from "./instance-manager";

/** "2026-10-12" в таймзоне клиента. */
export function localDateString(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }
}

/** Границы вчерашнего дня (UTC-моменты) для таймзоны клиента. */
function yesterdayRange(now: Date, timeZone: string): { from: Date; to: Date; label: string } {
  const todayStr = localDateString(now, timeZone);
  // Полночь сегодняшнего дня в tz: подбираем через смещение
  const offsetMin = tzOffsetMinutes(now, timeZone);
  const todayMidnightUtc = new Date(`${todayStr}T00:00:00Z`).getTime() - offsetMin * 60_000;
  const to = new Date(todayMidnightUtc);
  const from = new Date(todayMidnightUtc - 24 * 3600_000);
  const label = new Intl.DateTimeFormat("ru-RU", { timeZone, day: "numeric", month: "long", weekday: "long" }).format(from);
  return { from, to, label };
}

function tzOffsetMinutes(date: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(date);
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    return Math.round((asUtc - date.getTime()) / 60_000);
  } catch {
    return 300; // Asia/Almaty
  }
}

export async function buildDigest(instanceId: string, now = new Date()): Promise<string | null> {
  const inst = await prisma.wAInstance.findUnique({
    where: { id: instanceId },
    select: { label: true, phoneNumber: true, aiTimezone: true, aiPausedChats: true },
  });
  if (!inst) return null;
  const { from, to, label } = yesterdayRange(now, inst.aiTimezone);

  const incoming = await prisma.message.groupBy({
    by: ["chatId"],
    where: { instanceId, fromMe: false, createdAt: { gte: from, lt: to } },
    _count: { _all: true },
  });
  const replies = await prisma.message.count({
    where: { instanceId, fromMe: true, createdAt: { gte: from, lt: to } },
  });
  const chatIds = incoming.map((r) => r.chatId);
  if (!chatIds.length && !replies) {
    return `Сводка за ${label}\n${inst.label || "+" + (inst.phoneNumber || "")}\n\nОбращений не было.`;
  }

  const chats = await prisma.chat.findMany({
    where: { id: { in: chatIds } },
    select: { id: true, remoteJid: true, phoneNumber: true, name: true, leadData: true, leadStatus: true, updatedAt: true },
  });
  const newChats = await prisma.chat.count({
    where: { instanceId, createdAt: { gte: from, lt: to } },
  });
  const leads = chats.filter((c) => c.leadData);
  const meetings = leads.filter((c) => c.leadStatus === "meeting");
  const qualified = leads.filter((c) => c.leadStatus !== "meeting");
  const handedOff = chats.filter((c) => inst.aiPausedChats.includes(c.remoteJid));

  const lines: string[] = [];
  lines.push(`Сводка за ${label}`);
  lines.push(inst.label || `+${inst.phoneNumber || ""}`);
  lines.push("");
  lines.push(`Диалогов: ${chats.length} (новых клиентов: ${newChats})`);
  lines.push(`Ответов бота: ${replies}`);
  lines.push(`Квалифицировано: ${qualified.length}`);
  lines.push(`Встреч назначено: ${meetings.length}`);
  if (handedOff.length) lines.push(`Передано менеджеру: ${handedOff.length}`);

  const who = (c: (typeof chats)[number]) => {
    const d = c.leadData as LeadData | null;
    const name = d?.fields?.["Имя"] || c.name || "";
    const phone = c.phoneNumber ? `+${c.phoneNumber}` : c.remoteJid.split("@")[0];
    return name ? `${name}, ${phone}` : phone;
  };
  if (meetings.length) {
    lines.push("");
    lines.push("Встречи:");
    for (const c of meetings) {
      const d = c.leadData as LeadData | null;
      lines.push(`• ${who(c)} — ${d?.meeting?.datetime || "время уточнить"}${d?.meeting?.format ? `, ${d.meeting.format}` : ""}`);
    }
  }
  if (qualified.length) {
    lines.push("");
    lines.push("Лиды:");
    for (const c of qualified) {
      const d = c.leadData as LeadData | null;
      const extra = Object.entries(d?.fields || {})
        .filter(([k]) => k !== "Имя")
        .slice(0, 3)
        .map(([, v]) => v)
        .join(", ");
      lines.push(`• ${who(c)}${extra ? ` — ${extra}` : ""}`);
    }
  }
  if (handedOff.length) {
    lines.push("");
    lines.push("Ждут менеджера:");
    for (const c of handedOff.slice(0, 10)) lines.push(`• ${who(c)}`);
  }
  return lines.join("\n");
}

/** Раз в несколько минут: кому пора отправить сводку за вчера. */
export async function tickDailyDigest(now = new Date()): Promise<void> {
  const instances = await prisma.wAInstance.findMany({
    where: { aiDailyDigest: true, status: "CONNECTED" },
    select: { id: true, tenantId: true, aiTimezone: true, aiDigestHour: true, lastDigestDate: true, aiReportGroupJid: true },
  });
  for (const inst of instances) {
    const { hour } = localHourAndDay(now, inst.aiTimezone);
    const today = localDateString(now, inst.aiTimezone);
    if (hour < inst.aiDigestHour || inst.lastDigestDate === today) continue;

    // Сначала помечаем, потом шлём: лучше пропустить одну сводку, чем прислать её дважды
    const claimed = await prisma.wAInstance.updateMany({
      where: { id: inst.id, lastDigestDate: inst.lastDigestDate },
      data: { lastDigestDate: today },
    });
    if (!claimed.count) continue;

    try {
      const text = await buildDigest(inst.id, now);
      if (!text) continue;
      if (inst.aiReportGroupJid && isManaged(inst.id)) {
        await sendText(inst.id, inst.aiReportGroupJid, text);
      }
      const tenant = await prisma.tenant.findUnique({ where: { id: inst.tenantId }, select: { telegramChatId: true } });
      if (tenant?.telegramChatId) {
        await sendTelegram({ chatId: tenant.telegramChatId, text: `<pre>${escapeHtml(text)}</pre>` }).catch(() => {});
      }
      console.log(`[digest] ${inst.id} sent for ${today}`);
    } catch (e) {
      console.error(`[digest] ${inst.id} failed:`, (e as Error).message);
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
