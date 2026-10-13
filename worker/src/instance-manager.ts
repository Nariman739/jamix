import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket,
  proto,
} from "baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import { prisma } from "./db";
import { makeAuthState } from "./auth-state";
import { generateAiReply, shouldAiReply } from "./ai-reply";
import { dispatchWebhook } from "./webhook-dispatcher";
import { detectDncRequest, blockContact } from "./antiban";
import { checkAiQuota } from "./quota";
import { sendTelegram } from "./telegram";

// WA_LOG_LEVEL=info|debug включает лог Baileys (диагностика привязки); по умолчанию тихо.
const logger = pino({ level: process.env.WA_LOG_LEVEL || "silent" });
const QR_TTL_SECONDS = 60;

interface Holder {
  sock: WASocket;
  closing: boolean;
  reachedServer: boolean; // был QR или open — значит сеть есть, цикл штатный
  flush: () => Promise<void>; // дописать отложенную сессию в базу
}

const sockets = new Map<string, Holder>();

// Переподключение с нарастающей паузой. Без этого при пропаже сети воркер долбил
// WhatsApp десятками попыток в секунду (12.10.2026: 49 000 попыток за 40 минут).
const RECONNECT_BASE_MS = 5_000;
const RECONNECT_MAX_MS = 5 * 60_000;
const reconnectTimers = new Map<string, NodeJS.Timeout>();
const reconnectFailures = new Map<string, number>();

export function isManaged(instanceId: string) {
  return sockets.has(instanceId) || reconnectTimers.has(instanceId);
}

function scheduleReconnect(instanceId: string, reachedServer: boolean) {
  if (reconnectTimers.has(instanceId)) return;
  // Если до сервера дошли (был QR или open) — это штатный цикл, пауза базовая.
  // Если нет (сеть/DNS) — удваиваем до 5 минут.
  const failures = reachedServer ? 0 : (reconnectFailures.get(instanceId) ?? 0) + 1;
  reconnectFailures.set(instanceId, failures);
  const delay = Math.min(RECONNECT_BASE_MS * 2 ** Math.max(0, failures - 1), RECONNECT_MAX_MS);
  if (failures > 1) console.warn(`[wa] ${instanceId} reconnect in ${Math.round(delay / 1000)}s (failure #${failures})`);
  const t = setTimeout(() => {
    reconnectTimers.delete(instanceId);
    startInstance(instanceId).catch((e) => console.error(`[wa] reconnect ${instanceId} failed:`, e));
  }, delay);
  reconnectTimers.set(instanceId, t);
}

export async function startInstance(instanceId: string): Promise<void> {
  if (sockets.has(instanceId)) return;
  const pending = reconnectTimers.get(instanceId);
  if (pending) {
    clearTimeout(pending);
    reconnectTimers.delete(instanceId);
  }

  const inst = await prisma.wAInstance.findUnique({ where: { id: instanceId }, select: { id: true } });
  if (!inst) {
    console.warn(`[wa] startInstance: ${instanceId} not found`);
    return;
  }

  let auth;
  try {
    auth = await makeAuthState(instanceId);
  } catch (e) {
    console.error(`[wa] ${instanceId} auth-state error — clearing session:`, (e as Error).message);
    await prisma.wAInstance.update({
      where: { id: instanceId },
      data: { sessionBlob: null, status: "PENDING", qrCode: null },
    });
    return;
  }

  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: auth.state,
    logger,
    printQRInTerminal: false,
    browser: ["Jamiwa", "Chrome", "1.0.0"],
    syncFullHistory: false,
  });

  // Trap any unhandled WS errors so they never crash the worker
  try {
    const wsAny = (sock as unknown as { ws?: { on?: (e: string, cb: (...a: unknown[]) => void) => void } }).ws;
    wsAny?.on?.("error", (err: unknown) => {
      console.warn(`[wa] ${instanceId} ws error:`, (err as Error)?.message || err);
    });
  } catch {
    // ignore
  }

  sockets.set(instanceId, { sock, closing: false, reachedServer: false, flush: auth.flush });
  console.log(`[wa] ${instanceId} starting (Baileys ${version.join(".")})`);

  sock.ev.on("creds.update", auth.saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const h = sockets.get(instanceId);
      if (h) h.reachedServer = true;
      reconnectFailures.delete(instanceId);
      const expiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000);
      await prisma.wAInstance.update({
        where: { id: instanceId },
        data: { qrCode: qr, qrExpiresAt: expiresAt, status: "QR_READY" },
      });
      console.log(`[wa] ${instanceId} QR ready`);
    }

    if (connection === "open") {
      const h = sockets.get(instanceId);
      if (h) h.reachedServer = true;
      reconnectFailures.delete(instanceId);
      const me = sock.user;
      const phone = me?.id?.split(":")[0]?.split("@")[0] ?? null;
      // Set connectedAt only on first ever connect, so warm-up window starts once
      const existing = await prisma.wAInstance.findUnique({
        where: { id: instanceId },
        select: { connectedAt: true },
      });
      await prisma.wAInstance.update({
        where: { id: instanceId },
        data: {
          status: "CONNECTED",
          phoneNumber: phone,
          qrCode: null,
          qrExpiresAt: null,
          lastSeenAt: new Date(),
          connectedAt: existing?.connectedAt ?? new Date(),
        },
      });
      console.log(`[wa] ${instanceId} connected as ${me?.id}`);
      void refreshGroupsCache(instanceId, sock);
    }

    if (connection === "close") {
      const code = new Boom(lastDisconnect?.error).output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      const holder = sockets.get(instanceId);

      console.log(`[wa] ${instanceId} closed code=${code} loggedOut=${loggedOut}`);
      sockets.delete(instanceId);

      if (loggedOut) {
        const inst = await prisma.wAInstance.findUnique({
          where: { id: instanceId },
          select: {
            label: true,
            phoneNumber: true,
            tenant: { select: { name: true, telegramChatId: true } },
          },
        });
        await prisma.wAInstance.update({
          where: { id: instanceId },
          data: {
            status: "BANNED",
            bannedAt: new Date(),
            sessionBlob: null,
            qrCode: null,
            qrExpiresAt: null,
          },
        });
        const label = inst?.label || inst?.phoneNumber || instanceId;
        // Alert tenant
        if (inst?.tenant.telegramChatId) {
          await sendTelegram({
            chatId: inst.tenant.telegramChatId,
            text:
              `🚫 <b>Номер отключен от WhatsApp</b>\n\n` +
              `${escapeHtml(label)} больше не подключен. Возможные причины: вышли из WhatsApp Web с телефона / WhatsApp заблокировал номер.\n\n` +
              `Подключите новый QR в кабинете Jamiwa.`,
          }).catch(() => {});
        }
        // Alert admin (Nariman)
        const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID;
        if (adminChat) {
          await sendTelegram({
            chatId: adminChat,
            text:
              `🚫 <b>Instance BANNED</b>\n\n` +
              `Tenant: ${escapeHtml(inst?.tenant.name || "?")}\n` +
              `Instance: ${escapeHtml(label)}\n` +
              `code=${code}`,
          }).catch(() => {});
        }
        return;
      }

      // If we're not explicitly stopping it, try to reconnect after a short delay
      if (!holder?.closing) {
        await prisma.wAInstance.update({
          where: { id: instanceId },
          data: { status: "DISCONNECTED" },
        });
        scheduleReconnect(instanceId, holder?.reachedServer ?? false);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid) continue;

      // Игнорируем всё кроме личных диалогов: группы, каналы, рассылки, статусы.
      // WhatsApp банит за активность бота в группах + это раздражает участников.
      const isDirectMessage =
        remoteJid.endsWith("@s.whatsapp.net") || remoteJid.endsWith("@lid");
      if (!isDirectMessage) {
        // @g.us (group), @broadcast, @newsletter, status@broadcast — skip silently
        continue;
      }

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        null;

      if (!text) continue; // skip media for MVP

      const keyAny = msg.key as unknown as Record<string, string | undefined>;
      const phoneSrc = keyAny.senderPn || keyAny.participantPn || keyAny.remoteJidAlt;
      const phoneNumber =
        phoneSrc?.replace(/[^0-9]/g, "") ||
        (remoteJid.endsWith("@s.whatsapp.net") ? remoteJid.split("@")[0] : null);

      // WhatsApp может прислать одного контакта с двумя ID: @s.whatsapp.net и @lid.
      // Чтобы не плодить дубликаты — сначала ищем чат по phoneNumber, если есть.
      let chat = null as Awaited<ReturnType<typeof prisma.chat.findFirst>>;
      if (phoneNumber) {
        chat = await prisma.chat.findFirst({
          where: { instanceId, phoneNumber },
        });
      }
      if (chat) {
        // Существующий чат той же персоны → обновляем
        chat = await prisma.chat.update({
          where: { id: chat.id },
          data: {
            name: msg.pushName ?? chat.name ?? undefined,
            lastMsgAt: new Date(),
            unread: { increment: 1 },
          },
        });
      } else {
        // Нет известного телефона или новый контакт → upsert по remoteJid
        chat = await prisma.chat.upsert({
          where: { instanceId_remoteJid: { instanceId, remoteJid } },
          create: {
            instanceId,
            remoteJid,
            phoneNumber,
            name: msg.pushName || null,
            lastMsgAt: new Date(),
            unread: 1,
          },
          update: {
            phoneNumber: phoneNumber ?? undefined,
            name: msg.pushName ?? undefined,
            lastMsgAt: new Date(),
            unread: { increment: 1 },
          },
        });
      }

      await prisma.message.create({
        data: {
          chatId: chat.id,
          instanceId,
          fromMe: false,
          text,
          whatsappId: msg.key.id ?? null,
          status: "DELIVERED",
        },
      });

      console.log(`[in] ${instanceId} ${remoteJid}: ${text.slice(0, 60)}`);

      // DNC auto-detect — если получатель сам просит не писать, заносим в Block List
      const dncTrigger = detectDncRequest(text);
      if (dncTrigger) {
        await blockContact({
          instanceId,
          remoteJid,
          phoneNumber,
          trigger: dncTrigger,
        });
        // Pause AI in this chat too so мы не пытаемся ответить
        const cur = await prisma.wAInstance.findUnique({
          where: { id: instanceId },
          select: { aiPausedChats: true },
        });
        if (cur) {
          const set = new Set(cur.aiPausedChats);
          set.add(remoteJid);
          await prisma.wAInstance.update({
            where: { id: instanceId },
            data: { aiPausedChats: [...set] },
          });
        }
      }

      // Fire webhook if configured
      const instWithHook = await prisma.wAInstance.findUnique({
        where: { id: instanceId },
        select: { webhookUrl: true, webhookSecret: true },
      });
      if (instWithHook?.webhookUrl) {
        void dispatchWebhook(instWithHook.webhookUrl, instWithHook.webhookSecret, {
          event: "message.received",
          instanceId,
          data: {
            chatId: chat.id,
            from: remoteJid,
            phoneNumber,
            name: msg.pushName,
            text,
            whatsappId: msg.key.id,
          },
          occurredAt: new Date().toISOString(),
        });
      }

      // AI auto-reply (skip if DNC was just triggered — already paused above)
      if (dncTrigger) continue;
      // Без sessionBlob и groupsCache — они тяжёлые и здесь не нужны
      const fresh = await prisma.wAInstance.findUnique({
        where: { id: instanceId },
        omit: { sessionBlob: true, groupsCache: true, qrCode: true },
      });
      if (fresh && shouldAiReply(fresh, remoteJid)) {
        // Quota check — защита от пожирания токенов
        const tenant = await prisma.tenant.findUnique({
          where: { id: fresh.tenantId },
          select: { plan: true, currentPeriodEnd: true },
        });
        const quota = await checkAiQuota({
          tenantId: fresh.tenantId,
          chatId: chat.id,
          inputText: text,
          plan: tenant?.plan || "TRIAL",
          currentPeriodEnd: tenant?.currentPeriodEnd || null,
        });
        if (!quota.ok) {
          console.warn(`[ai] ${instanceId} skipped: ${quota.reason}`);
          continue;
        }

        // Старт AI генерации немедленно (параллельно с минимальной паузой 600мс
        // чтобы не выглядело как мгновенный бот). Outbound уже потом квантуется.
        const minDelay = 600 + Math.random() * 400; // 0.6-1.0 сек
        const start = Date.now();
        (async () => {
          try {
            const aiPromise = generateAiReply({
              inst: fresh,
              chatId: chat.id,
              remoteJid,
              fromPhone: phoneNumber,
              newUserMessage: text,
            });
            const [result] = await Promise.all([
              aiPromise,
              new Promise((r) => setTimeout(r, minDelay)),
            ]);
            const elapsed = Date.now() - start;
            if (!result || !result.reply) return;

            await prisma.outboundJob.create({
              data: {
                instanceId,
                to: remoteJid,
                payload: { type: "text", text: result.reply },
                status: "QUEUED",
              },
            });
            void elapsed;
            console.log(
              `[ai] ${instanceId} -> ${remoteJid}: ${result.reply.slice(0, 60)}${
                result.escalate ? " [HOT]" : ""
              }${result.handoff ? " [HANDOFF]" : ""}`,
            );
          } catch (e) {
            console.error(`[ai] reply failed:`, (e as Error).message);
          }
        })();
      }
    }
  });
}

export async function stopInstance(instanceId: string, opts: { logout?: boolean } = {}) {
  const pending = reconnectTimers.get(instanceId);
  if (pending) {
    clearTimeout(pending);
    reconnectTimers.delete(instanceId);
  }
  const holder = sockets.get(instanceId);
  if (!holder) return;
  holder.closing = true;
  try {
    if (opts.logout) await holder.sock.logout();
    else holder.sock.end(undefined);
  } catch (e) {
    console.warn(`[wa] stop ${instanceId}:`, (e as Error).message);
  }
  sockets.delete(instanceId);
  if (!opts.logout) await holder.flush().catch(() => {});
}

/** Список групп, где состоит номер — для выбора группы отчётов в кабинете. Не критично, ошибки глотаем. */
export async function refreshGroupsCache(instanceId: string, sock: WASocket): Promise<void> {
  try {
    // Небольшая пауза: сразу после open сервер ещё досылает метаданные
    await new Promise((r) => setTimeout(r, 4000));
    const groups = await sock.groupFetchAllParticipating();
    const list = Object.values(groups)
      .map((g) => ({ jid: g.id, name: g.subject || g.id, size: g.participants?.length ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"))
      .slice(0, 200);
    await prisma.wAInstance.update({ where: { id: instanceId }, data: { groupsCache: list } });
    console.log(`[wa] ${instanceId} groups cached: ${list.length}`);
  } catch (e) {
    console.warn(`[wa] ${instanceId} groups fetch failed:`, (e as Error).message);
  }
}

export async function sendText(
  instanceId: string,
  to: string,
  text: string,
): Promise<{ whatsappId: string | null }> {
  const holder = sockets.get(instanceId);
  if (!holder) throw new Error("Instance is not online");
  const jid = to.includes("@") ? to : `${to.replace(/[^0-9]/g, "")}@s.whatsapp.net`;
  const res = await holder.sock.sendMessage(jid, { text });
  return { whatsappId: res?.key?.id ?? null };
}

export async function shutdownAll() {
  const flushes: Promise<void>[] = [];
  for (const [id, holder] of sockets.entries()) {
    holder.closing = true;
    try {
      holder.sock.end(undefined);
    } catch {}
    sockets.delete(id);
    flushes.push(holder.flush().catch(() => {}));
  }
  for (const t of reconnectTimers.values()) clearTimeout(t);
  reconnectTimers.clear();
  // Дописываем сессии в базу, иначе после рестарта ключи разъедутся (Bad MAC)
  await Promise.all(flushes);
}

// Silence unused import warning — `proto` is re-exported for downstream consumers.
export { proto };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
