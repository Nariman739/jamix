"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Trash2, Send, CheckCircle2, AlertTriangle } from "lucide-react";

type Status =
  | "PENDING"
  | "QR_READY"
  | "CONNECTING"
  | "CONNECTED"
  | "DISCONNECTED"
  | "LOGGED_OUT"
  | "BANNED";

type Instance = {
  id: string;
  label: string | null;
  phoneNumber: string | null;
  status: Status;
  webhookUrl: string | null;
};

export function InstanceCard({ initial }: { initial: Instance }) {
  const router = useRouter();
  const [inst, setInst] = useState<Instance>(initial);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testText, setTestText] = useState("Привет от Jamiwa!");
  const [sendResult, setSendResult] = useState<string>("");
  const pollRef = useRef<number | null>(null);

  // Poll QR + status every 1.5s while not connected
  useEffect(() => {
    const tick = async () => {
      try {
        const res = await fetch(`/api/v1/wa/instances/${inst.id}/qr`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          status: Status;
          qrCode: string | null;
          phoneNumber: string | null;
        };

        if (data.qrCode) {
          const url = await QRCode.toDataURL(data.qrCode, { width: 320, margin: 2 });
          setQrDataUrl(url);
        } else {
          setQrDataUrl(null);
        }

        if (data.status !== inst.status || data.phoneNumber !== inst.phoneNumber) {
          setInst((prev) => ({
            ...prev,
            status: data.status,
            phoneNumber: data.phoneNumber ?? prev.phoneNumber,
          }));
        }
      } catch {
        /* swallow */
      }
    };

    if (inst.status === "CONNECTED" || inst.status === "BANNED") {
      // Slow poll, just keeps phone number / status fresh
      pollRef.current = window.setInterval(tick, 5000);
    } else {
      pollRef.current = window.setInterval(tick, 1500);
    }
    void tick();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [inst.id, inst.status, inst.phoneNumber]);

  const handleDelete = async () => {
    if (!confirm("Удалить этот номер?")) return;
    await fetch(`/api/v1/wa/instances/${inst.id}`, { method: "DELETE" });
    router.push("/cabinet");
    router.refresh();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendResult("Отправка...");
    try {
      const res = await fetch(`/api/v1/wa/instances/${inst.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo, text: testText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendResult(`Ошибка: ${data.error}`);
        return;
      }
      setSendResult(`✓ В очереди (job ${data.jobId.slice(0, 8)})`);
    } catch {
      setSendResult("Ошибка соединения");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition"
        >
          <Trash2 size={14} /> Удалить
        </button>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold">
            {inst.label || (inst.phoneNumber ? `+${inst.phoneNumber}` : "Новый номер")}
          </h1>
          <StatusBadge status={inst.status} />
        </div>
        {inst.phoneNumber && (
          <p className="text-sm text-muted-foreground">+{inst.phoneNumber}</p>
        )}
      </div>

      {/* QR screen */}
      {(inst.status === "PENDING" ||
        inst.status === "CONNECTING" ||
        inst.status === "QR_READY" ||
        inst.status === "LOGGED_OUT" ||
        inst.status === "DISCONNECTED") && (
        <div className="glass rounded-2xl p-6 text-center">
          <h2 className="font-semibold mb-4">Привяжите WhatsApp</h2>
          {qrDataUrl ? (
            <>
              <div className="inline-block bg-white p-3 rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR" width={320} height={320} />
              </div>
              <ol className="text-sm text-muted-foreground mt-6 space-y-1.5 text-left max-w-sm mx-auto">
                <li>1. Откройте WhatsApp на телефоне</li>
                <li>2. Настройки → Связанные устройства → Привязка устройства</li>
                <li>3. Наведите камеру на QR-код выше</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-4">
                QR обновляется каждые ~20 секунд автоматически
              </p>
            </>
          ) : (
            <div className="py-10">
              <div className="inline-block animate-pulse text-sm text-muted-foreground">
                Готовим QR-код... обычно 5-10 секунд
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Worker должен быть запущен: <code>npm run worker:dev</code>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Connected — test send */}
      {inst.status === "CONNECTED" && (
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-green-400" size={18} />
            Номер подключён — попробуем отправить
          </h2>
          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Кому (E.164 без +)
              </label>
              <input
                type="text"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="77001234567"
                className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
                required
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Текст</label>
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50 resize-none"
                required
              />
            </div>
            <Button type="submit" className="rounded-xl gap-2">
              <Send size={14} /> Отправить
            </Button>
            {sendResult && <p className="text-sm text-muted-foreground">{sendResult}</p>}
          </form>
        </div>
      )}

      {inst.status === "BANNED" && (
        <div className="glass rounded-2xl p-6 flex items-start gap-3">
          <AlertTriangle className="text-red-400 mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-medium text-red-400">Номер заблокирован WhatsApp</p>
            <p className="text-sm text-muted-foreground mt-1">
              Удалите этот инстанс и подключите другой номер. Прогревайте новые номера медленно.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    PENDING: { label: "Ожидает", cls: "bg-amber-500/10 text-amber-400" },
    CONNECTING: { label: "Подключение", cls: "bg-blue-500/10 text-blue-400" },
    QR_READY: { label: "Сканируйте QR", cls: "bg-blue-500/10 text-blue-400" },
    CONNECTED: { label: "Подключён", cls: "bg-green-500/10 text-green-400" },
    DISCONNECTED: { label: "Отключён", cls: "bg-zinc-500/10 text-zinc-400" },
    LOGGED_OUT: { label: "Нужен новый QR", cls: "bg-orange-500/10 text-orange-400" },
    BANNED: { label: "Заблокирован", cls: "bg-red-500/10 text-red-400" },
  };
  const item = map[status];
  return <span className={`text-xs px-2.5 py-1 rounded-full ${item.cls}`}>{item.label}</span>;
}
