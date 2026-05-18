"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Key, RefreshCw, Copy, Eye, EyeOff, Check } from "lucide-react";

export function ApiKeyPanel({
  apiKeyHint,
  instanceId,
}: {
  apiKeyHint: string;
  instanceId: string | null;
}) {
  const [hint, setHint] = useState(apiKeyHint);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const regenerate = async () => {
    if (
      !confirm(
        "Создать новый ключ? Старый сразу перестанет работать — обновите его во всех ваших интеграциях.",
      )
    ) {
      return;
    }
    setRegenerating(true);
    try {
      const res = await fetch("/api/cabinet/api-key", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Ошибка");
        return;
      }
      setRevealed(data.apiKey);
      setHint(data.apiKeyHint);
    } finally {
      setRegenerating(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const exampleId = instanceId || "INSTANCE_ID";
  const exampleKey = revealed || "YOUR_API_KEY";

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Key size={16} className="text-brand-blue" /> Ваш API ключ
        </h2>

        {revealed ? (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-2">
            <p className="text-sm text-amber-200 font-medium">
              Скопируйте ключ сейчас — мы больше не покажем его в открытом виде:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-black/30 rounded-lg px-3 py-2 font-mono break-all">
                {revealed}
              </code>
              <button
                type="button"
                onClick={() => copy(revealed, "key")}
                className="rounded-lg p-2 bg-muted/50 hover:bg-muted transition"
                title="Копировать"
              >
                {copied === "key" ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <button
              onClick={() => setRevealed(null)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-2"
            >
              <EyeOff size={12} /> Я скопировал, скрыть
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm bg-muted/40 rounded-lg px-3 py-2 font-mono">
              {hint}
              <span className="text-muted-foreground">...скрыто...</span>
            </code>
            <Button
              type="button"
              onClick={regenerate}
              disabled={regenerating}
              variant="outline"
              className="rounded-lg gap-1.5"
            >
              <RefreshCw size={14} /> {regenerating ? "..." : "Пересоздать"}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Используйте этот ключ в заголовке <code>Authorization: Bearer YOUR_API_KEY</code> для всех
          запросов.
        </p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold">Примеры использования</h2>

        <CodeBlock
          title="Список инстансов"
          code={`curl ${baseUrl}/api/v1/wa/instances \\
  -H "Authorization: Bearer ${exampleKey}"`}
          onCopy={(c) => copy(c, "list")}
          copied={copied === "list"}
        />

        <CodeBlock
          title="Отправить сообщение"
          code={`curl -X POST ${baseUrl}/api/v1/wa/instances/${exampleId}/send \\
  -H "Authorization: Bearer ${exampleKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"to": "77001234567", "text": "Привет от Jamiwa!"}'`}
          onCopy={(c) => copy(c, "send")}
          copied={copied === "send"}
        />

        <CodeBlock
          title="Получить статус и QR (для подключения)"
          code={`curl ${baseUrl}/api/v1/wa/instances/${exampleId}/qr \\
  -H "Authorization: Bearer ${exampleKey}"`}
          onCopy={(c) => copy(c, "qr")}
          copied={copied === "qr"}
        />

        <CodeBlock
          title="Список чатов"
          code={`curl ${baseUrl}/api/v1/wa/instances/${exampleId}/chats \\
  -H "Authorization: Bearer ${exampleKey}"`}
          onCopy={(c) => copy(c, "chats")}
          copied={copied === "chats"}
        />
      </div>

      <div className="glass rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold">Интеграции</h2>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>
            • <span className="text-foreground">n8n</span>: HTTP Request node с Bearer-токеном
          </li>
          <li>
            • <span className="text-foreground">AmoCRM / Bitrix</span>: webhook + HTTP node для
            отправки
          </li>
          <li>
            • <span className="text-foreground">Make / Zapier</span>: HTTP Request action
          </li>
          <li>
            • <span className="text-foreground">Свой сайт</span>: серверный код на любом языке —
            достаточно curl/fetch
          </li>
        </ul>
      </div>
    </div>
  );
}

function CodeBlock({
  title,
  code,
  onCopy,
  copied,
}: {
  title: string;
  code: string;
  onCopy: (code: string) => void;
  copied: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium">{title}</span>
        <button
          type="button"
          onClick={() => onCopy(code)}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
      <pre className="text-xs bg-black/30 rounded-xl px-3 py-2.5 overflow-x-auto font-mono leading-relaxed">
        {code}
      </pre>
    </div>
  );
}
