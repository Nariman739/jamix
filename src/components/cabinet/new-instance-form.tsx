"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";

export function NewInstanceForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/wa/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label || undefined,
          webhookUrl: webhookUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка создания");
        return;
      }
      router.push(`/cabinet/wa/instances/${data.instance.id}`);
      router.refresh();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-6 space-y-4">
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">Название номера</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Отдел продаж"
          className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
        />
      </div>

      <div>
        <label className="text-sm text-muted-foreground mb-1 block">
          Webhook URL <span className="text-muted-foreground/60">(опционально)</span>
        </label>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://your-app.com/wa-webhook"
          className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
        />
        <p className="text-xs text-muted-foreground mt-1">
          На этот адрес будут приходить входящие сообщения.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" className="w-full rounded-xl gap-2" disabled={loading}>
        <Smartphone size={16} />
        {loading ? "Создаём..." : "Создать"}
      </Button>
    </form>
  );
}
