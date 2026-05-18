import crypto from "crypto";

// Send a webhook to the tenant's URL. Fire-and-forget with 3 retries.
// HMAC-SHA256 signature in header `X-Jamiwa-Signature`.

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 8000;

export interface WebhookPayload {
  event:
    | "message.received"
    | "message.sent"
    | "instance.connected"
    | "instance.disconnected"
    | "ai.escalated";
  instanceId: string;
  data: Record<string, unknown>;
  occurredAt: string;
}

export async function dispatchWebhook(
  url: string,
  secret: string | null,
  payload: WebhookPayload,
): Promise<void> {
  // Validate URL once — refuse private/localhost
  if (!isSafeUrl(url)) {
    console.warn(`[webhook] rejected unsafe url: ${url}`);
    return;
  }

  const body = JSON.stringify(payload);
  const signature = secret
    ? crypto.createHmac("sha256", secret).update(body).digest("hex")
    : "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Jamiwa-Webhook/1.0",
          ...(signature && { "X-Jamiwa-Signature": signature }),
        },
        body,
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) return;
      if (res.status >= 400 && res.status < 500) {
        console.warn(`[webhook] ${url} → ${res.status} (client error, no retry)`);
        return;
      }
      console.warn(`[webhook] ${url} → ${res.status} attempt ${attempt}`);
    } catch (e) {
      console.warn(`[webhook] ${url} attempt ${attempt}:`, (e as Error).message);
    }
    if (attempt < MAX_ATTEMPTS) {
      await sleep(1000 * Math.pow(2, attempt - 1)); // 1s, 2s
    }
  }
}

function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0") return false;
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    if (host === "::1") return false;
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
