import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket,
  proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import { prisma } from "./db";
import { makeAuthState } from "./auth-state";
import { generateAiReply, shouldAiReply } from "./ai-reply";
import { dispatchWebhook } from "./webhook-dispatcher";
import { detectDncRequest, blockContact } from "./antiban";
import { sendTelegram } from "./telegram";

const logger = pino({ level: "silent" });
const QR_TTL_SECONDS = 60;

interface Holder {
  sock: WASocket;
  closing: boolean;
}

const sockets = new Map<string, Holder>();

export function isManaged(instanceId: string) {
  return sockets.has(instanceId);
}

export async function startInstance(instanceId: string): Promise<void> {
  if (sockets.has(instanceId)) return;

  const inst = await prisma.wAInstance.findUnique({ where: { id: instanceId } });
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

  sockets.set(instanceId, { sock, closing: false });
  console.log(`[wa] ${instanceId} starting (Baileys ${version.join(".")})`);

  sock.ev.on("creds.update", auth.saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const expiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000);
      await prisma.wAInstance.update({
        where: { id: instanceId },
        data: { qrCode: qr, qrExpiresAt: expiresAt, status: "QR_READY" },
      });
      console.log(`[wa] ${instanceId} QR ready`);
    }

    if (connection === "open") {
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
        setTimeout(() => {
          startInstance(instanceId).catch((e) =>
            console.error(`[wa] reconnect ${instanceId} failed:`, e),
          );
        }, 5000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid) continue;

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

      const chat = await prisma.chat.upsert({
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
      const fresh = await prisma.wAInstance.findUnique({ where: { id: instanceId } });
      if (fresh && shouldAiReply(fresh, remoteJid)) {
        const delay = 1500 + Math.random() * 1500;
        setTimeout(async () => {
          try {
            const result = await generateAiReply({
              inst: fresh,
              chatId: chat.id,
              remoteJid,
              fromPhone: phoneNumber,
              newUserMessage: text,
            });
            if (!result || !result.reply) return;

            await prisma.outboundJob.create({
              data: {
                instanceId,
                to: remoteJid,
                payload: { type: "text", text: result.reply },
                status: "QUEUED",
              },
            });
            console.log(
              `[ai] ${instanceId} -> ${remoteJid}: ${result.reply.slice(0, 60)}${
                result.escalate ? " [HOT]" : ""
              }${result.handoff ? " [HANDOFF]" : ""}`,
            );
          } catch (e) {
            console.error(`[ai] reply failed:`, (e as Error).message);
          }
        }, delay);
      }
    }
  });
}

export async function stopInstance(instanceId: string, opts: { logout?: boolean } = {}) {
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

export function shutdownAll() {
  for (const [id, holder] of sockets.entries()) {
    holder.closing = true;
    try {
      holder.sock.end(undefined);
    } catch {}
    sockets.delete(id);
  }
}

// Silence unused import warning — `proto` is re-exported for downstream consumers.
export { proto };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
