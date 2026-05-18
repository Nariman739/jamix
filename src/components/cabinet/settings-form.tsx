"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Send, Building2, Bell } from "lucide-react";

interface Props {
  initial: {
    name: string;
    plan: "FREE" | "TRIAL" | "STARTER" | "PRO" | "BUSINESS" | "EXPIRED";
    telegramChatId: string | null;
  };
}

export function SettingsForm({ initial }: Props) {
  const [name, setName] = useState(initial.name);
  const [telegramChatId, setTelegramChatId] = useState(initial.telegramChatId || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [testStatus, setTestStatus] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/cabinet/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, telegramChatId: telegramChatId || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Ошибка");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    setTestStatus("Отправляем...");
    try {
      const res = await fetch("/api/cabinet/settings/test-telegram", {
        method: "POST",
      });
      const data = await res.json();
      setTestStatus(res.ok ? "✓ Отправлено! Проверьте Telegram" : `Ошибка: ${data.error}`);
    } catch {
      setTestStatus("Ошибка соединения");
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Building2 size={16} className="text-brand-blue" /> Компания
        </h2>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Название</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Тариф:</span>
          <span className="px-2.5 py-0.5 text-xs rounded-full bg-brand-blue/10 text-brand-blue uppercase">
            {initial.plan}
          </span>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Bell size={16} className="text-brand-blue" /> Telegram-уведомления
        </h2>
        <p className="text-xs text-muted-foreground">
          Чтобы получать уведомления о горячих лидах: откройте Telegram, напишите{" "}
          <a
            href="https://t.me/JamiXXXBot?start=getid"
            target="_blank"
            rel="noopener"
            className="text-brand-blue hover:underline"
          >
            @JamiXXXBot
          </a>{" "}
          команду <code className="text-foreground">/start</code> — он пришлёт вам ваш chat_id.
          Скопируйте и вставьте сюда.
        </p>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Telegram chat_id</label>
          <input
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            placeholder="123456789"
            className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
          />
        </div>

        {telegramChatId && (
          <div>
            <button
              type="button"
              onClick={sendTestNotification}
              className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
            >
              <Send size={14} /> Отправить тестовое уведомление
            </button>
            {testStatus && (
              <p className="text-xs text-muted-foreground mt-1.5">{testStatus}</p>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="rounded-xl gap-2">
          <Save size={14} />
          {saving ? "Сохраняем..." : "Сохранить"}
        </Button>
        {saved && <span className="text-sm text-green-400">✓ Сохранено</span>}
      </div>
    </form>
  );
}
