import { prisma } from "./db";
import { isManaged, sendText } from "./instance-manager";

const MIN_GAP_MS = 800; // rate limit per instance — 1 msg / ~1s
const lastSentAt = new Map<string, number>();

type Payload = { type: "text"; text: string };

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

  // Rate limit per instance
  const last = lastSentAt.get(job.instanceId) ?? 0;
  const wait = MIN_GAP_MS - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait + Math.random() * 600));

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
