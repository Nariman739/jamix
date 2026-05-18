import {
  initAuthCreds,
  BufferJSON,
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
  proto,
} from "@whiskeysockets/baileys";
import { prisma } from "./db";
import { encryptSession, decryptSession } from "./wa-crypto";

type KeyMap = Record<string, Record<string, unknown>>;

export interface ManagedAuth {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}

export async function makeAuthState(instanceId: string): Promise<ManagedAuth> {
  const row = await prisma.wAInstance.findUnique({ where: { id: instanceId } });
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

  const persist = async () => {
    const json = JSON.stringify({ creds, keys }, BufferJSON.replacer);
    const blob = encryptSession(Buffer.from(json, "utf8"));
    await prisma.wAInstance.update({
      where: { id: instanceId },
      data: { sessionBlob: new Uint8Array(blob) },
    });
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
  };
}
