// Подхват при выходе бота «на смену». Сценарий: клиент написал в 17:40, менеджер не ответил,
// в 18:00 бот включился по расписанию — раньше он молчал, пока клиент не напишет снова.
// Раз в минуту смотрим, не перешёл ли номер из «бот спит» в «бот работает», и в этот момент
// отвечаем на свежие (до CATCHUP_MAX_AGE_MS) входящие, на которые никто не ответил.
import { prisma } from "./db";
import { isWithinSchedule } from "../../src/lib/bot-prompt";
import { isOnline } from "./instance-manager";
import { triggerAiForChat, maskJid } from "./inbound";

const CATCHUP_MAX_AGE_MS = 2 * 3600_000;
const lastActive = new Map<string, boolean>(); // instanceId → бот был активен на прошлом тике

export async function tickCatchup(now = new Date()): Promise<void> {
  const instances = await prisma.wAInstance.findMany({
    where: { aiEnabled: true, aiOnlyDuringHrs: true, status: "CONNECTED" },
    select: { id: true, aiWorkStartHr: true, aiWorkEndHr: true, aiTimezone: true, aiWorkDays: true, aiOffDaysActive: true, aiPausedChats: true },
  });
  for (const inst of instances) {
    if (inst.aiWorkStartHr == null || inst.aiWorkEndHr == null) continue;
    const active = isWithinSchedule(inst, now);
    const was = lastActive.get(inst.id);
    lastActive.set(inst.id, active);
    if (was === undefined || was || !active) continue; // первый тик, без изменений, или бот выключился
    if (!isOnline(inst.id)) continue;

    // Чаты, где последнее сообщение — от клиента, свежее и без ответа
    const since = new Date(now.getTime() - CATCHUP_MAX_AGE_MS);
    const chats = await prisma.chat.findMany({
      where: { instanceId: inst.id, lastMsgAt: { gte: since }, OR: [{ aiPausedUntil: null }, { aiPausedUntil: { lt: now } }] },
      select: { id: true, remoteJid: true, phoneNumber: true },
      take: 50,
    });
    let n = 0;
    for (const chat of chats) {
      if (inst.aiPausedChats.includes(chat.remoteJid)) continue;
      const last = await prisma.message.findFirst({
        where: { chatId: chat.id },
        orderBy: { createdAt: "desc" },
        select: { fromMe: true, text: true, createdAt: true },
      });
      if (!last || last.fromMe || !last.text || last.createdAt < since) continue;
      triggerAiForChat({ instanceId: inst.id, chatId: chat.id, remoteJid: chat.remoteJid, phone: chat.phoneNumber, text: last.text });
      n++;
      console.log(`[catchup] ${inst.id} ${maskJid(chat.remoteJid)}: ждал ответа с ${last.createdAt.toISOString()}`);
    }
    if (n) console.log(`[catchup] ${inst.id} бот вышел на смену, подхвачено чатов: ${n}`);
  }
}
