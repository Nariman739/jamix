"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Trash2, FlaskConical, AlertCircle } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

export function TestChatPanel({
  instanceId,
  initialPrompt,
  promptIsSet,
}: {
  instanceId: string;
  initialPrompt: string | null;
  promptIsSet: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [overridePrompt, setOverridePrompt] = useState(initialPrompt || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Msg = { role: "user", content: input.trim() };
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/wa/instances/${instanceId}/bot/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          overridePrompt: overridePrompt.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка AI");
        return;
      }
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
      {/* Chat */}
      <div className="glass rounded-2xl flex flex-col h-[600px]">
        <header className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FlaskConical size={16} className="text-brand-blue" />
            Симуляция клиента
          </div>
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setError("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <Trash2 size={12} /> Очистить
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              Напиши &laquo;Здравствуйте&raquo; или любое сообщение — посмотри как бот ответит.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-brand-blue/90 text-white"
                    : "bg-muted/60 text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted/60 rounded-2xl px-3 py-2 text-sm animate-pulse">
                Бот печатает...
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={sendMessage} className="border-t border-border/40 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              promptIsSet
                ? "Напиши клиентское сообщение..."
                : "Сначала задай роль во вкладке AI-бот"
            }
            disabled={!promptIsSet && !overridePrompt.trim()}
            className="flex-1 rounded-xl bg-muted/50 px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50 disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim() || (!promptIsSet && !overridePrompt.trim())}
            className="rounded-xl gap-1.5"
          >
            <Send size={14} /> Отправить
          </Button>
        </form>
      </div>

      {/* Side panel: override prompt */}
      <aside className="glass rounded-2xl p-4 h-fit">
        <h3 className="text-sm font-semibold mb-1">Промпт для пробы</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Меняй здесь чтобы быстро проверить варианты. Сохранится только если применишь во вкладке
          AI-бот.
        </p>
        <textarea
          value={overridePrompt}
          onChange={(e) => setOverridePrompt(e.target.value)}
          rows={16}
          className="w-full rounded-xl bg-muted/40 px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-brand-blue/50 resize-none font-mono"
          placeholder="Системный промпт..."
        />
      </aside>
    </div>
  );
}
