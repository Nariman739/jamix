"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, X, MessageCircle } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Привет! 👋 Я демо-бот Jamiwa. Такой же AI будет отвечать твоим клиентам в WhatsApp. Спроси что угодно — про цены, как подключить, как работает.",
};

const SUGGESTIONS = [
  "Сколько стоит?",
  "Как подключить?",
  "А WhatsApp не забанит?",
  "Что умеет AI?",
];

export function DemoChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/products/demo-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages([...next, { role: "assistant", content: data.reply }]);
      } else {
        setMessages([
          ...next,
          { role: "assistant", content: "Извини, AI временно не отвечает. Попробуй позже." },
        ]);
      }
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Ошибка соединения. Попробуй ещё раз." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-brand-blue text-white pl-4 pr-5 py-3 shadow-lg shadow-brand-blue/30 hover:scale-105 transition"
          aria-label="Открыть демо-чат"
        >
          <MessageCircle size={18} />
          <span className="text-sm font-medium hidden sm:inline">Поговорить с AI</span>
          <span className="text-sm font-medium sm:hidden">AI</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[380px] h-[560px] max-h-[calc(100vh-2.5rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-gradient-to-br from-brand-blue/20 to-brand-blue/5 border-b border-border/40 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-blue/30 flex items-center justify-center">
                <Bot size={16} className="text-brand-blue" />
              </div>
              <div>
                <div className="text-sm font-medium">Демо-бот Jamiwa</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Онлайн · AI отвечает за 2 сек
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50"
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                    m.role === "user"
                      ? "bg-brand-blue text-white"
                      : "bg-muted/60 text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/60 rounded-2xl px-3.5 py-2 text-sm">
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

          {/* Quick replies */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={loading}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
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
              placeholder="Напиши сообщение..."
              className="flex-1 rounded-xl bg-muted/50 px-3.5 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="rounded-xl bg-brand-blue text-white p-2 hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Отправить"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
