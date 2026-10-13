import {
  initAuthCreds,
  BufferJSON,
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
  proto,
} from "baileys";
import crypto from "crypto";
import { prisma } from "./db";
import { encryptSession, decryptSession } from "./wa-crypto";

type KeyMap = Record<string, Record<string, unknown>>;

const PERSIST_DEBOUNCE_MS = 5_000;

export interface ManagedAuth {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  /** Немедленно записать отложенные изменения (перед остановкой воркера). */
  flush: () => Promise<void>;
}

export async function makeAuthState(instanceId: string): Promise<ManagedAuth> {
  // Единственное место, где sessionBlob нужен целиком (глобально он omit'нут в db.ts)
  const row = await prisma.wAInstance.findUnique({
    where: { id: instanceId },
    select: { sessionBlob: true },
  });
  let creds: AuthenticationCreds;
  let keys: KeyMap = {};

  if (row?.sessionBlob && row.sessionBlob.length > 0) {
    try {
      const decrypted = decryptSession(Buffer.from(row.sessionBlob));
      const parsed = JSON.parse(decrypted.toString("utf8"), BufferJSON.reviver);
      creds = parsed.creds;
      keys = parsed.keys || {};
    } catch (e) {
      console.error(`[auth] failed to decrypt session for ${instanceId}:`, (e as Error).message);
      creds = initAuthCreds();
    }
  } else {
    creds = initAuthCreds();
  }

  // Сессия весит ~0,7 МБ, а Baileys дёргает creds.update / keys.set по несколько раз в минуту.
  // Пишем в базу не чаще раза в PERSIST_DEBOUNCE_MS (последний вызов побеждает) и только если
  // содержимое изменилось. Иначе это гигабайты трафика Neon в сутки.
  let timer: NodeJS.Timeout | null = null;
  let lastWrittenHash = "";
  let writing: Promise<void> | null = null;

  const writeNow = async () => {
    const json = JSON.stringify({ creds, keys }, BufferJSON.replacer);
    const hash = crypto.createHash("sha1").update(json).digest("hex");
    if (hash === lastWrittenHash) return;
    const blob = encryptSession(Buffer.from(json, "utf8"));
    await prisma.wAInstance.update({
      where: { id: instanceId },
      data: { sessionBlob: new Uint8Array(blob) },
    });
    lastWrittenHash = hash;
  };

  const persist = (): Promise<void> => {
    if (timer) return writing ?? Promise.resolve();
    writing = new Promise<void>((resolve) => {
      timer = setTimeout(async () => {
        timer = null;
        try {
          await writeNow();
        } catch (e) {
          console.error(`[auth] persist failed for ${instanceId}:`, (e as Error).message);
        } finally {
          writing = null;
          resolve();
        }
      }, PERSIST_DEBOUNCE_MS);
    });
    return writing;
  };

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
          const data: { [id: string]: SignalDataTypeMap[T] } = {};
          for (const id of ids) {
            let value = keys[type]?.[id];
            if (value && type === "app-state-sync-key") {
              value = proto.Message.AppStateSyncKeyData.fromObject(value as object);
            }
            if (value) data[id] = value as SignalDataTypeMap[T];
          }
          return data;
        },
        set: async (data) => {
          for (const category in data) {
            const cat = category as keyof SignalDataTypeMap;
            keys[cat] ||= {};
            for (const id in data[cat]) {
              const value = data[cat]![id];
              if (value === null || value === undefined) {
                delete keys[cat][id];
              } else {
                keys[cat][id] = value as unknown as object;
              }
            }
          }
          await persist();
        },
      },
    },
    saveCreds: persist,
    flush: async () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        writing = null;
      }
      await writeNow();
    },
  };
}
