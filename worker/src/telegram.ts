// Telegram bot client for escalation notifications.
// Uses the shared @JamiXXXBot — clients enter their chat_id in settings.

const TG_API = "https://api.telegram.org";

export async function sendTelegram(args: {
  chatId: string;
  text: string;
}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[tg] TELEGRAM_BOT_TOKEN not set — skipping notification");
    return false;
  }
  try {
    const res = await fetch(`${TG_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: args.chatId,
        text: args.text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.warn(`[tg] send failed: ${res.status} ${await res.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[tg] send error:", (e as Error).message);
    return false;
  }
}
