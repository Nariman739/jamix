"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { PlanConfig } from "@/lib/plans";

type Props = {
  tenantId: string;
  currentPlan: string;
  currentPeriodEnd: string | null;
  plans: PlanConfig[];
};

export function TenantBillingPanel({ tenantId, currentPlan, currentPeriodEnd, plans }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const activate = async (planKey: string, durationDays: number) => {
    if (!confirm(`Активировать ${planKey} на ${durationDays} дней?`)) return;
    setLoading(planKey);
    try {
      const res = await fetch(`/api/dashboard/tenants/${tenantId}/activate-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, durationDays, note }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Ошибка");
      } else {
        setNote("");
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  };

  const extend = async (days: number) => {
    if (!confirm(`Продлить текущий план на ${days} дней?`)) return;
    setLoading("extend");
    try {
      const res = await fetch(`/api/dashboard/tenants/${tenantId}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, note }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Ошибка");
      } else {
        setNote("");
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  };

  const expire = async () => {
    if (!confirm("Отключить план немедленно? (Доступ будет закрыт)")) return;
    setLoading("expire");
    try {
      const res = await fetch(`/api/dashboard/tenants/${tenantId}/expire`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Ошибка");
      } else {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="font-bold mb-2">Управление подпиской</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Текущий план: <strong>{currentPlan}</strong> до{" "}
        {currentPeriodEnd
          ? new Intl.DateTimeFormat("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(new Date(currentPeriodEnd))
          : "—"}
      </p>

      <div className="space-y-3">
        <label className="block">
          <span className="text-xs text-muted-foreground mb-1 block">
            Заметка (например: "Каспи перевод 4990₸ 18.05.2026")
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="опционально"
            className="w-full rounded-xl bg-muted/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plans.map((p) => (
            <div key={p.key} className="border border-border/40 rounded-xl p-4">
              <div className="font-bold">{p.name}</div>
              <div className="text-2xl font-bold gradient-text my-2">
                {p.priceKzt.toLocaleString("ru-RU")} ₸
                <span className="text-xs text-muted-foreground font-normal">/мес</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 mb-3 h-20">
                {p.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <Button
                onClick={() => activate(p.key, 30)}
                disabled={loading !== null}
                className="w-full rounded-lg text-sm"
              >
                {loading === p.key ? "..." : `Активировать на 30 дней`}
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t border-border/40 pt-3 flex flex-wrap gap-2">
          <Button
            onClick={() => extend(30)}
            disabled={loading !== null}
            variant="secondary"
            className="rounded-lg text-sm"
          >
            {loading === "extend" ? "..." : "Продлить на 30 дней"}
          </Button>
          <Button
            onClick={() => extend(7)}
            disabled={loading !== null}
            variant="secondary"
            className="rounded-lg text-sm"
          >
            Продлить на 7 дней
          </Button>
          <Button
            onClick={expire}
            disabled={loading !== null}
            variant="destructive"
            className="rounded-lg text-sm ml-auto"
          >
            {loading === "expire" ? "..." : "Отключить план"}
          </Button>
        </div>
      </div>
    </div>
  );
}
