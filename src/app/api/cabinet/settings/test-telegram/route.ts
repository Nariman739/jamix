import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantUser } from "@/lib/tenant-auth";

export async function POST() {
  const user = await getCurrentTenantUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant?.telegramChatId) {
    return NextResponse.json({ error: "Telegram chat_id не указан" }, { status: 400 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Бот не настроен" }, { status: 500 });

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: tenant.telegramChatId,
        text: `✓ <b>Jamiwa подключена</b>\n\nКомпания: <b>${escapeHtml(tenant.name)}</b>\n\nТеперь вы будете получать уведомления о горячих лидах от AI-бота.`,
        parse_mode: "HTML",
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return NextResponse.json({ error: `Telegram отклонил: ${t.slice(0, 100)}` }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
