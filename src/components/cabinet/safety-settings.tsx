"use client";

import { useState } from "react";

export function SafetySettings({
  instanceId,
  initial,
}: {
  instanceId: string;
  initial: { onlyReplies: boolean };
}) {
  const [onlyReplies, setOnlyReplies] = useState(initial.onlyReplies);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleOnlyReplies = async (next: boolean) => {
    setSaving(true);
    setError(null);
    const prev = onlyReplies;
    setOnlyReplies(next);
    try {
      const res = await fetch(`/api/v1/wa/instances/${instanceId}/safety`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyReplies: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Ошибка сохранения");
      }
    } catch (e) {
      setOnlyReplies(prev);
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={onlyReplies}
          disabled={saving}
          onChange={(e) => toggleOnlyReplies(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-brand-blue cursor-pointer"
        />
        <div>
          <div className="text-sm font-medium">Только ответы (безопасный режим)</div>
          <p className="text-xs text-muted-foreground mt-1">
            Бот пишет только тем, кто написал нам первым. Cold-сообщения и
            рассылки полностью отключены — максимальная защита от бана.
          </p>
        </div>
      </label>

      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
