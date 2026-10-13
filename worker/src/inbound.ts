// Входящие сообщения WhatsApp: сохранение, ответы менеджера с телефона, склейка серии,
// голосовые/медиа, DNC и игнор-лист, запуск ИИ. Вынесено из instance-manager.
import { normalizeMessageContent, getContentType, WAMessage, WASocket } from "baileys";
import { prisma } from "./db";
import { generateAiReply, shouldAiReply } from "./ai-reply";
import { dispatchWebhook } from "./webhook-dispatcher";
import { detectDncRequest, blockContact, isBlocked } from "./antiban";
import { checkAiQuota } from "./quota";
import { sendTelegram } from "./telegram";
import { sendText } from "./instance-manager";

const BATCH_MS = 7_000; // клиент пишет серией — ждём паузу и отвечаем одним сообщением
const MANUAL_PAUSE_MS = 12 * 3600_000; // менеджер ответил сам → бот молчит в чате 12 ч
const OFFLINE_MAX_AGE_MS = 15 * 60_000; // сообщения, пришедшие пока воркер был офлайн: отвечаем, если свежие
const VOICE_FALLBACK_EVERY_MS = 6 * 3600_000; // заглушку на голосовое шлём не чаще раза в 6 ч на чат
const SENT_IDS_MAX = 5000;

// ID сообщений, отправленных нами через sendText — чтобы отличать свои от ручных (менеджер с телефона)
const sentIds = new Set<string>();
export function rememberSentId(id: string | null | undefined) {
  if (!id) return;
  sentIds.add(id);
  if (sentIds.size > SENT_IDS_MAX) {
    const first = sentIds.values().next().value;
    if (first) sentIds.delete(first);
  }
}

type Pending = { timer: NodeJS.Timeout | null; inFlight: boolean; dirty: boolean; lastJid: string; lastText: string; phone: string | null };
const pending = new Map<string, Pending>(); // chatId → очередь на склейку
const voiceFallbackAt = new Map<string, number>(); // chatId → когда слали заглушку

export function maskJid(jid: string): string {
  const digits = jid.split("@")[0].replace(/[^0-9]/g, "");
  if (digits.length < 7) return jid.replace(/[0-9]/g, "*");
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
}

type Content =
  | { kind: "text"; text: string }
  | { kind: "voice" | "image" | "video" | "document" | "sticker" | "other"; text: string | null }
  | null; // служебное (реакция, protocolMessage…) — пропускаем

function extractContent(msg: WAMessage): Content {
  const content = normalizeMessageContent(msg.message ?? undefined);
  if (!content) return null;
  const type = getContentType(content);
  switch (type) {
    case "conversation":
      return content.conversation ? { kind: "text", text: content.conversation } : null;
    case "extendedTextMessage":
      return content.extendedTextMessage?.text ? { kind: "text", text: content.extendedTextMessage.text } : null;
    case "audioMessage":
      return { kind: "voice", text: null };
    case "imageMessage":
      return { kind: "image", text: content.imageMessage?.caption || null };
    case "videoMessage":
      return { kind: "video", text: content.videoMessage?.caption || null };
    case "documentMessage":
      return { kind: "document", text: content.documentMessage?.caption || content.documentMessage?.fileName || null };
    case "stickerMessage":
      return { kind: "sticker", text: null };
    case "protocolMessage":
    case "reactionMessage":
    case "senderKeyDistributionMessage":
    case "pollUpdateMessage":
    case undefined:
      return null;
    default:
      return { kind: "other", text: null };
  }
}

function msgTimestampMs(msg: WAMessage): number {
  const ts = msg.messageTimestamp;
  const n = typeof ts === "number" ? ts : ts ? Number(ts.toString()) : 0;
  return n ? n * 1000 : Date.now();
}

export async function handleUpsert(
  instanceId: string,
  sock: WASocket,
  ev: { messages: WAMessage[]; type: string },
): Promise<void> {
  // 'notify' — живые сообщения; 'append' — накопившиеся, пока устройство было офлайн (деплой, обрыв).
  // История при первом подключении приходит другим событием (messaging-history.set) и сюда не попадает.
  if (process.env.WA_LOG_LEVEL) {
    console.log(
      `[in] upsert type=${ev.type} n=${ev.messages.length} ` +
        ev.messages.map((m) => `${maskJid(m.key.remoteJid || "?")}${m.key.fromMe ? "/me" : ""}:${m.message ? getContentType(normalizeMessageContent(m.message) ?? undefined) ?? "?" : "stub" + (m.messageStubType ?? "")}`).join(" "),
    );
  }
  if (ev.type !== "notify" && ev.type !== "append") return;
  const offline = ev.type === "append";

  for (const msg of ev.messages) {
    try {
      await handleOne(instanceId, sock, msg, offline);
    } catch (e) {
      console.error(`[in] ${instanceId} handle failed:`, (e as Error).message);
    }
  }
}

async function handleOne(instanceId: string, sock: WASocket, msg: WAMessage, offline: boolean) {
  void sock;
  if (!msg.message) return;
  const remoteJid = msg.key.remoteJid;
  if (!remoteJid) return;

  // Только личные диалоги: группы, каналы, рассылки, статусы — мимо (бан-риск и шум)
  const isDirectMessage = remoteJid.endsWith("@s.whatsapp.net") || remoteJid.endsWith("@lid");
  if (!isDirectMessage) return;

  const content = extractContent(msg);
  if (!content) return;
  const waId = msg.key.id ?? null;

  // Baileys при подключении досылает историю чатов телефона тоже как 'append'. Это чужая переписка
  // владельца (семья, друзья, коды из банка) — её нельзя ни сохранять, ни считать «ответом менеджера».
  // Берём только свежее: что пришло, пока воркер был офлайн считанные минуты.
  if (offline && Date.now() - msgTimestampMs(msg) > OFFLINE_MAX_AGE_MS) return;

  const keyAny = msg.key as unknown as Record<string, string | undefined>;
  const phoneSrc = keyAny.senderPn || keyAny.participantPn || keyAny.remoteJidAlt;
  const phoneNumber =
    phoneSrc?.replace(/[^0-9]/g, "") || (remoteJid.endsWith("@s.whatsapp.net") ? remoteJid.split("@")[0] : null);

  if (msg.key.fromMe) {
    // Старые свои сообщения (история) — не «менеджер только что ответил»
    if (Date.now() - msgTimestampMs(msg) > OFFLINE_MAX_AGE_MS) return;
    await handleManual({ instanceId, remoteJid, phoneNumber, waId, content });
    return;
  }

  // Чат: один контакт = один чат, даже если WhatsApp присылает его то как @s.whatsapp.net, то как @lid
  let chat = phoneNumber ? await prisma.chat.findFirst({ where: { instanceId, phoneNumber } }) : null;
  if (chat) {
    chat = await prisma.chat.update({
      where: { id: chat.id },
      data: { name: msg.pushName ?? chat.name ?? undefined, lastMsgAt: new Date(), unread: { increment: 1 } },
    });
  } else {
    chat = await prisma.chat.upsert({
      where: { instanceId_remoteJid: { instanceId, remoteJid } },
      create: { instanceId, remoteJid, phoneNumber, name: msg.pushName || null, lastMsgAt: new Date(), unread: 1 },
      update: { phoneNumber: phoneNumber ?? undefined, name: msg.pushName ?? undefined, lastMsgAt: new Date(), unread: { increment: 1 } },
    });
  }

  const text = content.text;
  // Дедупликация: WhatsApp может доставить то же сообщение повторно (retry, переподключение, append)
  try {
    await prisma.message.create({
      data: { chatId: chat.id, instanceId, fromMe: false, text, kind: content.kind, whatsappId: waId, status: "DELIVERED" },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return; // уже есть
    throw e;
  }

  console.log(`[in] ${instanceId} ${maskJid(remoteJid)} ${content.kind}${text ? ` ${text.length} зн.` : ""}${offline ? " (offline)" : ""}`);

  // Клиент сам просит не писать → в блок-лист, бот молчит, владельцу сообщаем
  const dncTrigger = text ? detectDncRequest(text) : null;
  if (dncTrigger) {
    await blockContact({ instanceId, remoteJid, phoneNumber, trigger: dncTrigger });
    await pauseChatForever(instanceId, remoteJid);
    await notifyOwner(instanceId, `🙅 Клиент ${phoneNumber ? "+" + phoneNumber : maskJid(remoteJid)} попросил не писать («${dncTrigger}»). Бот в этом чате больше не отвечает. Разблокировать: кабинет → номер → Защита.`);
    return;
  }

  // Вебхук арендатора
  const hook = await prisma.wAInstance.findUnique({ where: { id: instanceId }, select: { webhookUrl: true, webhookSecret: true } });
  if (hook?.webhookUrl) {
    void dispatchWebhook(hook.webhookUrl, hook.webhookSecret, {
      event: "message.received",
      instanceId,
      data: { chatId: chat.id, from: remoteJid, phoneNumber, name: msg.pushName, text, kind: content.kind, whatsappId: waId },
      occurredAt: new Date().toISOString(),
    });
  }

  // Игнор-лист / DNC — проверяем ДО вызова ИИ, и по jid, и по телефону (@lid иначе проскакивает)
  if (await isBlocked(instanceId, remoteJid, phoneNumber)) return;

  const inst = await prisma.wAInstance.findUnique({
    where: { id: instanceId },
    omit: { sessionBlob: true, groupsCache: true, qrCode: true },
  });
  if (!inst || !shouldAiReply(inst, remoteJid)) return;

  // Менеджер ведёт этот чат сам
  if (chat.aiPausedUntil && chat.aiPausedUntil > new Date()) return;

  // Офлайн-сообщения: отвечаем только если после них никто не ответил
  if (offline) {
    const later = await prisma.message.findFirst({
      where: { chatId: chat.id, fromMe: true, createdAt: { gt: new Date(msgTimestampMs(msg)) } },
      select: { id: true },
    });
    if (later) return;
  }

  if (!text) {
    if (content.kind === "voice") await voiceFallback(instanceId, chat.id, remoteJid, inst.aiHandoffMessage);
    return; // стикеры/фото без подписи — бот молчит, но сообщение сохранено
  }

  queueForAi({ instanceId, chatId: chat.id, remoteJid, phone: phoneNumber, text });
}

/** fromMe, которого мы не отправляли = менеджер написал с телефона. Сохраняем и ставим чат на паузу. */
async function handleManual(args: { instanceId: string; remoteJid: string; phoneNumber: string | null; waId: string | null; content: Content }) {
  const { instanceId, remoteJid, phoneNumber, waId, content } = args;
  if (!content) return;
  if (waId && sentIds.has(waId)) return;
  if (waId) {
    const ours = await prisma.message.findUnique({ where: { instanceId_whatsappId: { instanceId, whatsappId: waId } }, select: { id: true } });
    if (ours) return;
  }
  let chat = phoneNumber ? await prisma.chat.findFirst({ where: { instanceId, phoneNumber } }) : null;
  if (!chat) {
    chat = await prisma.chat.upsert({
      where: { instanceId_remoteJid: { instanceId, remoteJid } },
      create: { instanceId, remoteJid, phoneNumber, lastMsgAt: new Date() },
      update: { lastMsgAt: new Date() },
    });
  }
  const pauseUntil = new Date(Date.now() + MANUAL_PAUSE_MS);
  await prisma.chat.update({ where: { id: chat.id }, data: { lastManualAt: new Date(), aiPausedUntil: pauseUntil, lastMsgAt: new Date() } });
  try {
    await prisma.message.create({
      data: { chatId: chat.id, instanceId, fromMe: true, manual: true, text: content.text, kind: content.kind, whatsappId: waId, status: "SENT" },
    });
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") throw e;
  }
  // Менеджер взял чат — отложенный ответ бота больше не нужен
  const p = pending.get(chat.id);
  if (p?.timer) {
    clearTimeout(p.timer);
    pending.delete(chat.id);
  }
  console.log(`[in] ${instanceId} ${maskJid(remoteJid)} manual reply → AI paused until ${pauseUntil.toISOString()}`);
}

async function pauseChatForever(instanceId: string, remoteJid: string) {
  const cur = await prisma.wAInstance.findUnique({ where: { id: instanceId }, select: { aiPausedChats: true } });
  if (!cur) return;
  const set = new Set(cur.aiPausedChats);
  set.add(remoteJid);
  await prisma.wAInstance.update({ where: { id: instanceId }, data: { aiPausedChats: [...set] } });
}

/** Сообщение владельцу: в группу отчётов (если задана) и в Telegram. */
export async function notifyOwner(instanceId: string, text: string) {
  const inst = await prisma.wAInstance.findUnique({
    where: { id: instanceId },
    select: { aiReportGroupJid: true, tenant: { select: { telegramChatId: true } } },
  });
  if (!inst) return;
  if (inst.aiReportGroupJid) {
    await sendText(instanceId, inst.aiReportGroupJid, text).catch((e) => console.warn(`[notify] group failed:`, (e as Error).message));
  }
  if (inst.tenant.telegramChatId) {
    await sendTelegram({ chatId: inst.tenant.telegramChatId, text: escapeHtml(text) }).catch(() => {});
  }
}

async function voiceFallback(instanceId: string, chatId: string, remoteJid: string, handoffMessage: string | null) {
  const last = voiceFallbackAt.get(chatId) ?? 0;
  if (Date.now() - last < VOICE_FALLBACK_EVERY_MS) return;
  voiceFallbackAt.set(chatId, Date.now());
  const text = "Голосовые я пока не слушаю. Напишите, пожалуйста, текстом — отвечу сразу. Голосовое передам менеджеру.";
  void handoffMessage;
  await prisma.outboundJob.create({ data: { instanceId, to: remoteJid, payload: { type: "text", text }, status: "QUEUED" } });
  await notifyOwner(instanceId, `🎤 Клиент ${maskJid(remoteJid)} прислал голосовое — бот его не слушает, посмотрите в WhatsApp.`);
}

/** Склейка серии: ждём BATCH_MS тишины, затем один вызов ИИ на всё. Пока ответ готовится — новые копятся. */
/** Внешний запуск ответа ИИ для чата (подхват сообщений без ответа при выходе бота на смену). */
export function triggerAiForChat(args: { instanceId: string; chatId: string; remoteJid: string; phone: string | null; text: string }) {
  queueForAi(args);
}

function queueForAi(args: { instanceId: string; chatId: string; remoteJid: string; phone: string | null; text: string }) {
  const { instanceId, chatId, remoteJid, phone, text } = args;
  let p = pending.get(chatId);
  if (!p) {
    p = { timer: null, inFlight: false, dirty: false, lastJid: remoteJid, lastText: text, phone };
    pending.set(chatId, p);
  }
  p.lastJid = remoteJid;
  p.lastText = text;
  p.phone = phone;
  if (p.inFlight) {
    p.dirty = true; // после текущей генерации сделаем ещё одну
    return;
  }
  if (p.timer) clearTimeout(p.timer);
  p.timer = setTimeout(() => {
    p!.timer = null;
    void runAi(instanceId, chatId);
  }, BATCH_MS);
}

async function runAi(instanceId: string, chatId: string) {
  const p = pending.get(chatId);
  if (!p || p.inFlight) return;
  p.inFlight = true;
  p.dirty = false;
  try {
    const inst = await prisma.wAInstance.findUnique({
      where: { id: instanceId },
      omit: { sessionBlob: true, groupsCache: true, qrCode: true },
    });
    const chat = await prisma.chat.findUnique({ where: { id: chatId }, select: { aiPausedUntil: true } });
    if (!inst || !shouldAiReply(inst, p.lastJid)) return;
    if (chat?.aiPausedUntil && chat.aiPausedUntil > new Date()) return; // менеджер успел ответить

    const tenant = await prisma.tenant.findUnique({ where: { id: inst.tenantId }, select: { plan: true, currentPeriodEnd: true } });
    const quota = await checkAiQuota({
      tenantId: inst.tenantId,
      chatId,
      inputText: p.lastText,
      plan: tenant?.plan || "TRIAL",
      currentPeriodEnd: tenant?.currentPeriodEnd || null,
    });
    if (!quota.ok) {
      console.warn(`[ai] ${instanceId} skipped: ${quota.reason}`);
      return;
    }

    // История уже содержит все сообщения серии; newUserMessage — последнее, чтобы не дублировать
    const result = await generateAiReply({ inst, chatId, remoteJid: p.lastJid, fromPhone: p.phone, newUserMessage: p.lastText });
    if (!result || !result.reply) return;

    await prisma.outboundJob.create({
      data: { instanceId, to: p.lastJid, payload: { type: "text", text: result.reply }, status: "QUEUED" },
    });
    console.log(`[ai] ${instanceId} → ${maskJid(p.lastJid)} ${result.reply.length} зн.${result.escalate ? " [HOT]" : ""}${result.handoff ? " [HANDOFF]" : ""}${result.lead ? " [LEAD]" : ""}`);
  } catch (e) {
    console.error(`[ai] reply failed:`, (e as Error).message);
  } finally {
    p.inFlight = false;
    if (p.dirty) {
      p.dirty = false;
      p.timer = setTimeout(() => {
        p.timer = null;
        void runAi(instanceId, chatId);
      }, BATCH_MS);
    } else if (!p.timer) {
      pending.delete(chatId);
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
