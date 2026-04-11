// Meta (Facebook/Instagram) Pixel helper
// Pixel ID is set via NEXT_PUBLIC_META_PIXEL_ID env variable

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

// Track standard Meta events
export function trackEvent(event: string, data?: Record<string, string>) {
  if (typeof window === "undefined") return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fbq = (window as any).fbq;
  if (!fbq) return;

  if (data) {
    fbq("track", event, data);
  } else {
    fbq("track", event);
  }
}

// Shortcut: user clicked "Попробовать AI-продавца" (chat open)
export function trackLead() {
  trackEvent("Lead", { content_name: "chat_open" });
}

// Shortcut: user clicked "Написать в Telegram"
export function trackContact() {
  trackEvent("Contact", { content_name: "telegram_click" });
}
