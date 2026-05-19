"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Bot, Sparkles, Check, MessageCircle } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Привет! 👋 Я помогу настроить твоего AI-помощника, который будет отвечать твоим клиентам в WhatsApp.\n\nРасскажи кратко — **чем занимается твой бизнес?**",
};

type SetupConfig = {
  businessName?: string;
  botName?: string | null;
  systemPrompt: string;
  knowledgeBase?: string;
  escalateOnHotLead?: boolean;
  escalateOnHandoff?: boolean;
  handoffMessage?: string;
};

export function SetupAssistant({ existingInstanceId }: { existingInstanceId: string | null }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<SetupConfig | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, config]);

  const send = async (text: string) => {
    if (!text.trim() || loading || config) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/cabinet/setup-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      const reply = data.reply as string;
      setMessages([...next, { role: "assistant", content: reply }]);
      if (data.finished && data.config) {
        setConfig(data.config as SetupConfig);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!config) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/cabinet/setup-chat/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, instanceId: existingInstanceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сохранить");
      // Redirect: if no instance was connected — go to QR, else to test
      const url = data.needsConnection
        ? `/cabinet/wa/instances/${data.instanceId}`
        : `/cabinet/wa/instances/${data.instanceId}/test`;
      router.push(url);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setApplying(false);
    }
  };

  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <header className="border-b border-border/40 px-4 py-3 flex items-center gap-2 bg-gradient-to-r from-brand-blue/10 to-transparent">
        <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center">
          <Sparkles size={14} className="text-brand-blue" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">Мастер настройки</div>
          <div className="text-[11px] text-muted-foreground">
            {config ? "Готово!" : loading ? "печатает..." : "задаст 5-7 вопросов"}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                m.role === "user"
                  ? "bg-brand-blue text-white"
                  : "bg-muted/60 text-foreground"
              }`}
              dangerouslySetInnerHTML={
                m.role === "assistant" ? { __html: renderMarkdown(m.content) } : undefined
              }
            >
              {m.role === "user" ? m.content : undefined}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted/60 rounded-2xl px-4 py-2.5 text-sm">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Footer: completion card OR input */}
      {config ? (
        <div className="border-t border-border/40 p-4 space-y-3 bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Check size={16} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">
                Бот для «{config.businessName || "тебя"}» собран
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Промпт {config.systemPrompt.length} симв.
                {config.knowledgeBase ? ` · база знаний ${config.knowledgeBase.length} симв.` : ""}
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="button"
            onClick={apply}
            disabled={applying}
            className="w-full rounded-xl bg-brand-blue text-white py-2.5 text-sm font-medium hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <MessageCircle size={16} />
            {applying ? "Сохраняем..." : "Готово — попробовать бота"}
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-border/40 p-3 flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напиши ответ..."
            className="flex-1 rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="rounded-xl bg-brand-blue text-white p-2.5 hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Отправить"
          >
            <Send size={16} />
          </button>
        </form>
      )}
      {error && !config && (
        <div className="border-t border-rose-500/20 px-3 py-2 text-xs text-rose-400 bg-rose-500/5">
          {error}
        </div>
      )}
    </div>
  );
}

// Lightweight markdown: only **bold** + newlines + line breaks.
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/\n/g, "<br/>");
}
