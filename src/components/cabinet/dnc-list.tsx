"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

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

  if (contacts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Список пуст. Если клиент напишет «стоп» или «не пишите» — он появится здесь автоматически.
      </p>
    );
  }

  return (
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
