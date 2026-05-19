import { prisma } from "./db";
import { isManaged, sendText } from "./instance-manager";
import {
  isBlocked,
  warmupLimit,
  countTodayColdOutreach,
  chatHasIncoming,
} from "./antiban";

const MIN_GAP_MS = 1000; // soft rate limit — ~1 msg/sec on a given number
const JITTER_MS = 1200; // random extra delay 0..1200ms — looks human
const lastSentAt = new Map<string, number>();

type Payload = { type: "text"; text: string };

/** Result of a pre-send anti-ban check. If skip — job marked FAILED with reason. */
type PreflightResult =
  | { ok: true }
  | { ok: false; reason: string };

async function preflight(args: {
  instanceId: string;
  to: string;
}): Promise<PreflightResult> {
  // Build remoteJid (chat key)
  const remoteJid = args.to.includes("@")
    ? args.to
    : `${args.to.replace(/[^0-9]/g, "")}@s.whatsapp.net`;

  // 1. DNC — recipient asked us to stop
  if (await isBlocked(args.instanceId, remoteJid)) {
    return { ok: false, reason: "recipient in DNC list (USER_REQUESTED)" };
  }

  const inst = await prisma.wAInstance.findUnique({
    where: { id: args.instanceId },
    select: {
      connectedAt: true,
      onlyReplies: true,
      bulkPausedUntil: true,
    },
  });
  if (!inst) return { ok: false, reason: "instance not found" };

  // 2. Bulk-pause — mass outreach detected earlier, defer
  if (inst.bulkPausedUntil && inst.bulkPausedUntil > new Date()) {
    return { ok: false, reason: `bulk-paused until ${inst.bulkPausedUntil.toISOString()}` };
  }

  // 3. Find chat (if exists) — replies don't count against warm-up
  const chat = await prisma.chat.findUnique({
    where: { instanceId_remoteJid: { instanceId: args.instanceId, remoteJid } },
    select: { id: true },
  });
  const isReply = chat ? await chatHasIncoming(chat.id) : false;

  // 4. onlyReplies tumbler — пишем ТОЛЬКО тем кто написал первый
  if (inst.onlyReplies && !isReply) {
    return { ok: false, reason: "onlyReplies=true and recipient never wrote first" };
  }

  // 5. Warm-up for new numbers — limits ONLY cold outreach, replies always OK
  if (!isReply) {
    const limit = warmupLimit(inst.connectedAt);
    if (limit !== null) {
      const today = await countTodayColdOutreach(args.instanceId);
      if (today >= limit) {
        return { ok: false, reason: `warm-up limit reached (${today}/${limit} cold msgs today)` };
      }
    }
  }

  return { ok: true };
}

async function processOne(jobId: string) {
  const job = await prisma.outboundJob.findUnique({
    where: { id: jobId },
    include: { instance: true },
  });
  if (!job) return;

  if (!isManaged(job.instanceId)) {
    // worker has not picked up this instance yet, defer
    return;
  }

  // Anti-ban preflight
  const check = await preflight({ instanceId: job.instanceId, to: job.to });
  if (!check.ok) {
    console.warn(`[out] job ${job.id} skipped: ${check.reason}`);
    await prisma.outboundJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMsg: check.reason, processedAt: new Date() },
    });
    return;
  }

  // Soft rate limit per instance — invisible to humans, hard for spam detection
  const last = lastSentAt.get(job.instanceId) ?? 0;
  const wait = MIN_GAP_MS - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait + Math.random() * JITTER_MS));
  else await new Promise((r) => setTimeout(r, Math.random() * JITTER_MS / 2)); // tiny jitter even when not throttled

  try {
    const payload = job.payload as Payload;
    if (payload.type !== "text") {
      throw new Error(`Unsupported payload type: ${payload.type}`);
    }

    const result = await sendText(job.instanceId, job.to, payload.text);
    lastSentAt.set(job.instanceId, Date.now());

    // Find or create chat for outbound message
    const remoteJid = job.to.includes("@")
      ? job.to
      : `${job.to.replace(/[^0-9]/g, "")}@s.whatsapp.net`;

    const phoneDigits = job.to.replace(/[^0-9]/g, "");
    const chat = await prisma.chat.upsert({
      where: { instanceId_remoteJid: { instanceId: job.instanceId, remoteJid } },
      create: {
        instanceId: job.instanceId,
        remoteJid,
        phoneNumber: phoneDigits || null,
        lastMsgAt: new Date(),
      },
      update: { lastMsgAt: new Date() },
    });

    await prisma.message.create({
      data: {
        chatId: chat.id,
        instanceId: job.instanceId,
        fromMe: true,
        text: payload.text,
        whatsappId: result.whatsappId,
        status: "SENT",
      },
    });

    await prisma.outboundJob.update({
      where: { id: job.id },
      data: { status: "DONE", processedAt: new Date() },
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error(`[out] job ${job.id} failed:`, msg);
    await prisma.outboundJob.update({
      where: { id: job.id },
      data: {
        status: job.attempts + 1 >= 3 ? "FAILED" : "QUEUED",
        attempts: { increment: 1 },
        errorMsg: msg,
        scheduledAt: new Date(Date.now() + 5000),
      },
    });
  }
}

export async function tickOutbound() {
  const jobs = await prisma.outboundJob.findMany({
    where: {
      status: "QUEUED",
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });

  for (const j of jobs) {
    // Mark as processing first to avoid double pick (in case multiple workers run)
    const claimed = await prisma.outboundJob.updateMany({
      where: { id: j.id, status: "QUEUED" },
      data: { status: "PROCESSING" },
    });
    if (claimed.count === 0) continue;
    await processOne(j.id);
  }
}
