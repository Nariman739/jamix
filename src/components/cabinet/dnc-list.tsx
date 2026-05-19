"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";

type Contact = {
  id: string;
  remoteJid: string;
  phoneNumber: string | null;
  reason: string;
  trigger: string | null;
  createdAt: string;
};

export function DncList({
  instanceId,
  contacts,
}: {
  instanceId: string;
  contacts: Contact[];
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const remove = async (id: string) => {
    if (!confirm("Убрать контакт из DNC? Мы сможем снова ему писать.")) return;
    setRemoving(id);
    try {
      await fetch(`/api/v1/wa/instances/${instanceId}/dnc/${id}`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setRemoving(null);
    }
  };

  const addBulk = async () => {
    const phones = bulkText
      .split(/[\n,;]+/)
      .map((s) => s.trim().replace(/[^0-9]/g, ""))
      .filter((s) => s.length >= 8);
    if (phones.length === 0) {
      setBulkResult("Не нашёл ни одного валидного номера");
      return;
    }
    setBulkSaving(true);
    setBulkResult(null);
    let ok = 0;
    for (const phoneNumber of phones) {
      try {
        const res = await fetch(`/api/v1/wa/instances/${instanceId}/dnc`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber }),
        });
        if (res.ok) ok++;
      } catch {
        // skip
      }
    }
    setBulkSaving(false);
    setBulkResult(`Добавлено ${ok} из ${phones.length}`);
    setBulkText("");
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div>
        <button
          type="button"
          onClick={() => setBulkOpen((v) => !v)}
          className="text-xs text-brand-blue hover:underline inline-flex items-center gap-1"
        >
          <Plus size={12} /> Добавить номера вручную
        </button>
        {bulkOpen && (
          <div className="mt-2 space-y-2">
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="+77001234567&#10;77009876543&#10;+7 700 555 22 33&#10;&#10;(один номер на строку или через запятую)"
              rows={5}
              className="w-full rounded-xl bg-muted/40 border border-border/40 px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-brand-blue/50"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={addBulk}
                disabled={bulkSaving || !bulkText.trim()}
                className="rounded-lg bg-brand-blue text-white px-3 py-1.5 text-xs hover:bg-brand-blue/90 disabled:opacity-50"
              >
                {bulkSaving ? "Добавляем..." : "Добавить в DNC"}
              </button>
              {bulkResult && (
                <span className="text-xs text-muted-foreground">{bulkResult}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Список пуст. Если клиент напишет «стоп» или «не пишите» — он появится здесь автоматически.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-mono truncate">
                  {c.phoneNumber ? `+${c.phoneNumber}` : c.remoteJid.split("@")[0]}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {c.trigger ? `«${c.trigger}»` : c.reason} · {formatDate(c.createdAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(c.id)}
                disabled={removing === c.id}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50"
                aria-label="Убрать из DNC"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
