import "./bootstrap";
import os from "os";
import { prisma } from "./db";
import { startInstance, stopInstance, shutdownAll, isManaged } from "./instance-manager";
import { tickOutbound } from "./outbound-handler";
import { tickBulkDetection } from "./antiban";
import { tickGlobalQuotaAlert } from "./quota";

const NODE_KEY = process.env.WORKER_NODE_KEY || os.hostname();
const POLL_MS = 1500;
const HEARTBEAT_MS = 30_000;
const BULK_DETECT_MS = 60_000;
const QUOTA_ALERT_MS = 5 * 60_000;

async function registerNode() {
  const node = await prisma.workerNode.upsert({
    where: { nodeKey: NODE_KEY },
    create: { nodeKey: NODE_KEY, status: "ONLINE" },
    update: { status: "ONLINE", lastHeartbeat: new Date() },
  });
  console.log(`[worker] node registered: ${NODE_KEY} (id=${node.id})`);

  // Reset any instances that were stuck in transient states from a previous crash
  const reset = await prisma.wAInstance.updateMany({
    where: {
      workerNodeId: node.id,
      status: { in: ["CONNECTING", "QR_READY"] },
    },
    data: { status: "PENDING", qrCode: null, qrExpiresAt: null },
  });
  if (reset.count > 0) {
    console.log(`[worker] reset ${reset.count} stuck instance(s) to PENDING`);
  }
  return node.id;
}

async function heartbeat(nodeId: string) {
  await prisma.workerNode.update({
    where: { id: nodeId },
    data: { lastHeartbeat: new Date(), instanceCount: countManaged() },
  });
}

function countManaged(): number {
  // We rely on instance-manager state but expose via re-import to avoid cycle
  // Simpler: just query DB
  return -1; // updated below
}

async function claimAndStartInstances(nodeId: string) {
  // Pick up: not yet assigned to anyone, OR assigned to me but not running
  const candidates = await prisma.wAInstance.findMany({
    where: {
      status: { notIn: ["BANNED", "LOGGED_OUT"] },
      OR: [{ workerNodeId: null }, { workerNodeId: nodeId }],
    },
    take: 20,
  });

  for (const inst of candidates) {
    if (isManaged(inst.id)) continue;

    // Atomically claim
    const claimed = await prisma.wAInstance.updateMany({
      where: { id: inst.id, OR: [{ workerNodeId: null }, { workerNodeId: nodeId }] },
      data: { workerNodeId: nodeId, status: "CONNECTING" },
    });
    if (claimed.count === 0) continue;

    try {
      await startInstance(inst.id);
    } catch (e) {
      console.error(`[worker] start ${inst.id} failed:`, (e as Error).message);
      await prisma.wAInstance.update({
        where: { id: inst.id },
        data: { status: "DISCONNECTED" },
      });
    }
  }
}

async function expireOldQRs() {
  const res = await prisma.wAInstance.updateMany({
    where: {
      status: "QR_READY",
      qrExpiresAt: { lt: new Date() },
    },
    data: { qrCode: null },
  });
  if (res.count > 0) console.log(`[worker] expired ${res.count} QR(s)`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!process.env.WA_ENCRYPTION_KEY) throw new Error("WA_ENCRYPTION_KEY is required");

  const nodeId = await registerNode();

  const tick = async () => {
    try {
      await claimAndStartInstances(nodeId);
    } catch (e) {
      console.error("[worker] claim error:", formatError(e));
    }
    try {
      await tickOutbound();
    } catch (e) {
      console.error("[worker] outbound error:", formatError(e));
    }
    try {
      await expireOldQRs();
    } catch (e) {
      console.error("[worker] expireQR error:", formatError(e));
    }
  };

  const tickInterval = setInterval(tick, POLL_MS);
  const heartbeatInterval = setInterval(() => heartbeat(nodeId).catch(() => {}), HEARTBEAT_MS);
  const bulkInterval = setInterval(
    () => tickBulkDetection().catch((e) => console.error("[bulk] tick error:", formatError(e))),
    BULK_DETECT_MS,
  );
  const quotaAlertInterval = setInterval(
    () => tickGlobalQuotaAlert().catch((e) => console.error("[quota] alert error:", formatError(e))),
    QUOTA_ALERT_MS,
  );
  await tick();

  const shutdown = async (signal: string) => {
    console.log(`[worker] ${signal} received, shutting down...`);
    clearInterval(tickInterval);
    clearInterval(heartbeatInterval);
    clearInterval(bulkInterval);
    clearInterval(quotaAlertInterval);
    shutdownAll();
    await prisma.workerNode.update({
      where: { id: nodeId },
      data: { status: "OFFLINE" },
    }).catch(() => {});
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  console.log("[worker] ready, polling every", POLL_MS, "ms");
}

// Last-resort handlers — never crash on a single Baileys WS error
process.on("unhandledRejection", (reason) => {
  console.error("[worker] unhandledRejection:", formatError(reason));
});
process.on("uncaughtException", (e) => {
  console.error("[worker] uncaughtException:", formatError(e));
});

function formatError(e: unknown): string {
  if (!e) return "(no error)";
  if (e instanceof Error) return `${e.message}\n${e.stack ?? ""}`;
  if (typeof e === "object") {
    try {
      return JSON.stringify(e, Object.getOwnPropertyNames(e));
    } catch {
      return String(e);
    }
  }
  return String(e);
}

main().catch((e) => {
  console.error("[worker] fatal:", formatError(e));
  process.exit(1);
});

// Suppress unused warning
void stopInstance;
