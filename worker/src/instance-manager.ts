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
import { sendTelegram } from "./telegram";
import { handleUpsert, rememberSentId } from "./inbound";

// WA_LOG_LEVEL=info|debug включает лог Baileys (диагностика привязки); по умолчанию тихо.
const logger = pino({ level: process.env.WA_LOG_LEVEL || "silent" });
const QR_TTL_SECONDS = 60;

interface Holder {
  sock: WASocket;
  closing: boolean;
  reachedServer: boolean; // был QR или open — значит сеть есть, цикл штатный
  flush: () => Promise<void>; // дописать отложенную сессию в базу
  cancel: () => void; // отменить отложенную запись (после разлогина)
  open: boolean; // connection === "open"
}

// Номера, у которых startInstance ещё не дошёл до sockets.set (между await'ами).
// Без этого claim-цикл и таймер переподключения могли поднять второй сокет на те же ключи.
const starting = new Set<string>();

const sockets = new Map<string, Holder>();

// Переподключение с нарастающей паузой. Без этого при пропаже сети воркер долбил
// WhatsApp десятками попыток в секунду (12.10.2026: 49 000 попыток за 40 минут).
const RECONNECT_BASE_MS = 5_000;
const RECONNECT_MAX_MS = 5 * 60_000;
const reconnectTimers = new Map<string, NodeJS.Timeout>();
const reconnectFailures = new Map<string, number>();

export function isManaged(instanceId: string) {
  return sockets.has(instanceId) || reconnectTimers.has(instanceId) || starting.has(instanceId);
}

/** Сокет реально открыт (connection === "open"), а не в процессе старта/переподключения. */
export function isOnline(instanceId: string) {
  const h = sockets.get(instanceId);
  return !!h && h.open;
}

const VERSION_FETCH_TIMEOUT_MS = 5_000;
/** Версия WA Web с апстрима; при таймауте — вшитая в пакет (Baileys сам подставит). */
async function resolveWaVersion(): Promise<[number, number, number] | undefined> {
  try {
    const res = await Promise.race([
      fetchLatestBaileysVersion(),
      new Promise<null>((r) => setTimeout(() => r(null), VERSION_FETCH_TIMEOUT_MS)),
    ]);
    return res?.version as [number, number, number] | undefined;
  } catch {
    return undefined;
  }
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
  if (sockets.has(instanceId) || starting.has(instanceId)) return;
  starting.add(instanceId);
  try {
    await startInstanceInner(instanceId);
  } finally {
    starting.delete(instanceId);
  }
}

async function startInstanceInner(instanceId: string): Promise<void> {
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

  const version = await resolveWaVersion();

  const sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: auth.state,
    logger,
    printQRInTerminal: false,
    browser: ["Jamiwa", "Chrome", "1.0.0"],
    syncFullHistory: false,
    // Иначе номер «онлайн» 24/7 и WhatsApp перестаёт слать push на телефон владельца
    markOnlineOnConnect: false,
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

  sockets.set(instanceId, { sock, closing: false, reachedServer: false, open: false, flush: auth.flush, cancel: auth.cancel });
  console.log(`[wa] ${instanceId} starting (WA ${version ? version.join(".") : "builtin"})`);

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
      if (h) {
        h.reachedServer = true;
        h.open = true;
      }
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
      const holder = sockets.get(instanceId);

      // Закрылся старый сокет, а в Map уже новый — не трогаем живой
      if (holder && holder.sock !== sock) {
        console.log(`[wa] ${instanceId} stale socket closed code=${code}, ignoring`);
        return;
      }
      console.log(`[wa] ${instanceId} closed code=${code}`);
      sockets.delete(instanceId);

      const kind = classifyDisconnect(code);

      if (kind === "logged_out" || kind === "bad_session") {
        // Разлогиненные/битые creds в базу не пишем
        holder?.cancel();
        await setNeedsRelink(instanceId, code, kind);
        return;
      }
      if (kind === "banned") {
        holder?.cancel();
        await setBanned(instanceId, code);
        return;
      }

      // Дописываем сессию ДО переподключения, иначе новый сокет прочитает устаревшие ключи
      await holder?.flush().catch((e) => console.warn(`[wa] ${instanceId} flush on close failed:`, (e as Error).message));

      if (kind === "replaced") {
        // Кто-то открыл этот номер в другом месте (второй воркер / локальный тест). Не бодаемся.
        await prisma.wAInstance.update({ where: { id: instanceId }, data: { status: "DISCONNECTED" } });
        await alertAdmin(`⚠️ <b>Номер открыт в другом месте</b> (code 440)\nInstance: ${instanceId}\nАвтопереподключение остановлено — проверь, нет ли второго воркера.`);
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

  sock.ev.on("messages.upsert", (ev) => {
    void handleUpsert(instanceId, sock, ev);
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

type DisconnectKind = "logged_out" | "banned" | "bad_session" | "replaced" | "retry";

/**
 * Коды закрытия Baileys: 401 — отвязали устройство / телефон 14 дней офлайн (нужен новый QR);
 * 403 — бан; 500 badSession и 411 multidevice mismatch — сессия битая, нужен новый QR;
 * 440 — тот же номер открыт в другом месте; остальное (408, 428, 503, 515…) — переподключаемся.
 */
function classifyDisconnect(code: number | undefined): DisconnectKind {
  switch (code) {
    case DisconnectReason.loggedOut:
      return "logged_out";
    case DisconnectReason.forbidden:
      return "banned";
    case DisconnectReason.badSession:
    case DisconnectReason.multideviceMismatch:
      return "bad_session";
    case DisconnectReason.connectionReplaced:
      return "replaced";
    default:
      return "retry";
  }
}

async function instanceLabel(instanceId: string) {
  const inst = await prisma.wAInstance.findUnique({
    where: { id: instanceId },
    select: { label: true, phoneNumber: true, tenant: { select: { name: true, telegramChatId: true } } },
  });
  return { inst, label: inst?.label || (inst?.phoneNumber ? `+${inst.phoneNumber}` : instanceId) };
}

async function alertAdmin(text: string) {
  const adminChat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChat) return;
  await sendTelegram({ chatId: adminChat, text }).catch(() => {});
}

/** 401/500/411: сессия больше не действует, владелец должен привязать номер заново. Чаты и настройки сохраняем. */
async function setNeedsRelink(instanceId: string, code: number | undefined, kind: DisconnectKind) {
  const { inst, label } = await instanceLabel(instanceId);
  await prisma.wAInstance.update({
    where: { id: instanceId },
    data: { status: "LOGGED_OUT", sessionBlob: null, qrCode: null, qrExpiresAt: null },
  });
  const why =
    kind === "logged_out"
      ? "устройство отвязали в телефоне (Связанные устройства) или телефон был не в сети больше 14 дней"
      : "WhatsApp сбросил сессию";
  if (inst?.tenant.telegramChatId) {
    await sendTelegram({
      chatId: inst.tenant.telegramChatId,
      text:
        `🔌 <b>Номер отключился от бота</b>\n\n${escapeHtml(label)}: ${why}.\n\n` +
        `Откройте кабинет Jamiwa → номер → «Привязать заново» и отсканируйте QR. Настройки и переписка сохранены.`,
    }).catch(() => {});
  }
  await alertAdmin(`🔌 <b>Нужна повторная привязка</b>\nTenant: ${escapeHtml(inst?.tenant.name || "?")}\nInstance: ${escapeHtml(label)}\ncode=${code} (${kind})`);
}

/** 403: WhatsApp заблокировал номер. */
async function setBanned(instanceId: string, code: number | undefined) {
  const { inst, label } = await instanceLabel(instanceId);
  await prisma.wAInstance.update({
    where: { id: instanceId },
    data: { status: "BANNED", bannedAt: new Date(), sessionBlob: null, qrCode: null, qrExpiresAt: null },
  });
  if (inst?.tenant.telegramChatId) {
    await sendTelegram({
      chatId: inst.tenant.telegramChatId,
      text:
        `🚫 <b>WhatsApp заблокировал номер</b>\n\n${escapeHtml(label)}: получен код 403. ` +
        `Проверьте номер в приложении WhatsApp; если он работает — напишите нам, разберёмся.`,
    }).catch(() => {});
  }
  await alertAdmin(`🚫 <b>Instance BANNED</b>\nTenant: ${escapeHtml(inst?.tenant.name || "?")}\nInstance: ${escapeHtml(label)}\ncode=${code}`);
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
  rememberSentId(res?.key?.id);
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
