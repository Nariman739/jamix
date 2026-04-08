import type { LeadData } from "./lead-extractor";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.NARIMAN_TELEGRAM_CHAT_ID;

export async function notifyNewLead(sessionId: string, leadData: LeadData): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;

  const lines = [
    "🔔 *Новый лид на JAMX!*",
    "",
    `👤 *Имя:* ${leadData.contactName || "не указано"}`,
    `🏢 *Бизнес:* ${leadData.businessType || "не указан"}${leadData.businessName ? ` (${leadData.businessName})` : ""}`,
    "",
  ];

  if (leadData.currentProblems?.length) {
    lines.push(`📋 *Проблемы:*`);
    leadData.currentProblems.forEach((p) => lines.push(`  • ${p}`));
    lines.push("");
  }

  if (leadData.recommendedServices?.length) {
    lines.push(`💡 *Рекомендуемые услуги:* ${leadData.recommendedServices.join(", ")}`);
  }

  if (leadData.summary) {
    lines.push(`\n📝 *Резюме:* ${leadData.summary}`);
  }

  if (leadData.contactPhone) lines.push(`📱 *Телефон:* ${leadData.contactPhone}`);
  if (leadData.contactTelegram) lines.push(`✈️ *Telegram:* ${leadData.contactTelegram}`);

  if (leadData.qualificationScore) {
    lines.push(`\n⭐ *Оценка:* ${leadData.qualificationScore}/10`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://jamix.ai.kz";
  lines.push(`\n🔗 [Открыть в дашборде](${siteUrl}/dashboard/leads/${sessionId})`);

  const text = lines.join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.error("Telegram notification failed:", e);
  }
}
