"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Pause, Play, MessageSquare, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChatItem = {
  id: string;
  remoteJid: string;
  phoneNumber: string | null;
  name: string | null;
  lastMsgAt: string | null;
  unread: number;
  lastMessage: { text: string | null; fromMe: boolean; createdAt: string } | null;
  aiPaused: boolean;
};

type ChatMessage = {
  id: string;
  fromMe: boolean;
  text: string | null;
  status: string;
  createdAt: string;
};

export function ChatsView({ instanceId, aiEnabled }: { instanceId: string; aiEnabled: boolean }) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<{
    chat: ChatItem;
    messages: ChatMessage[];
  } | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadChats = useCallback(async () => {
    const res = await fetch(`/api/v1/wa/instances/${instanceId}/chats`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setChats(data.chats);
  }, [instanceId]);

  const loadChat = useCallback(async (chatId: string) => {
    const res = await fetch(`/api/v1/wa/chats/${chatId}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setActiveChat({ chat: data.chat, messages: data.messages });
  }, []);

  useEffect(() => {
    void loadChats();
    const id = setInterval(loadChats, 5000);
    return () => clearInterval(id);
  }, [loadChats]);

  useEffect(() => {
    if (!activeChatId) return;
    void loadChat(activeChatId);
    const id = setInterval(() => loadChat(activeChatId), 3000);
    return () => clearInterval(id);
  }, [activeChatId, loadChat]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || !draft.trim() || sending) return;
    setSending(true);
    try {
      const to = activeChat.chat.phoneNumber || activeChat.chat.remoteJid;
      const res = await fetch(`/api/v1/wa/instances/${instanceId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, text: draft.trim() }),
      });
      if (res.ok) {
        setDraft("");
        // Optimistic: append outgoing
        setActiveChat((prev) =>
          prev
            ? {
                ...prev,
                messages: [
                  ...prev.messages,
                  {
                    id: `temp-${Date.now()}`,
                    fromMe: true,
                    text: draft.trim(),
                    status: "PENDING",
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : prev,
        );
      }
    } finally {
      setSending(false);
    }
  };

  const togglePause = async () => {
    if (!activeChat) return;
    const newPaused = !activeChat.chat.aiPaused;
    const res = await fetch(`/api/v1/wa/chats/${activeChat.chat.id}/ai-pause`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paused: newPaused }),
    });
    if (res.ok) {
      setActiveChat({ ...activeChat, chat: { ...activeChat.chat, aiPaused: newPaused } });
      void loadChats();
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="glass rounded-2xl grid grid-cols-1 md:grid-cols-[300px_1fr] h-[calc(100vh-280px)] min-h-[500px] overflow-hidden">
      {/* Sidebar — chat list */}
      <aside className="border-r border-border/40 overflow-y-auto">
        {chats.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            Переписок пока нет. Они появятся когда кто-то напишет вам в WhatsApp.
          </p>
        ) : (
          <ul className="divide-y divide-border/30">
            {chats.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveChatId(c.id)}
                  className={`w-full text-left p-3 hover:bg-muted/30 transition ${
                    activeChatId === c.id ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium truncate">
                      {c.name || (c.phoneNumber ? `+${c.phoneNumber}` : c.remoteJid.split("@")[0])}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(c.lastMsgAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {c.lastMessage?.fromMe && <span>Вы: </span>}
                      {c.lastMessage?.text || "—"}
                    </p>
                    {c.aiPaused && aiEnabled && (
                      <span title="AI на паузе" className="text-amber-400">
                        <Pause size={10} />
                      </span>
                    )}
                    {c.unread > 0 && (
                      <span className="bg-brand-blue text-white text-[10px] rounded-full px-1.5 py-0.5">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main — active chat */}
      <main className="flex flex-col overflow-hidden">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
              <p>Выберите переписку слева</p>
            </div>
          </div>
        ) : (
          <>
            <header className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  {activeChat.chat.name ||
                    (activeChat.chat.phoneNumber
                      ? `+${activeChat.chat.phoneNumber}`
                      : activeChat.chat.remoteJid.split("@")[0])}
                </div>
                <div className="text-xs text-muted-foreground">
                  {activeChat.chat.phoneNumber && `+${activeChat.chat.phoneNumber}`}
                </div>
              </div>
              {aiEnabled && (
                <button
                  type="button"
                  onClick={togglePause}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition ${
                    activeChat.chat.aiPaused
                      ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                      : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                  }`}
                  title={
                    activeChat.chat.aiPaused
                      ? "Возобновить автоответы бота для этого чата"
                      : "Поставить бота на паузу — будешь отвечать вручную"
                  }
                >
                  {activeChat.chat.aiPaused ? (
                    <>
                      <Play size={12} /> Включить AI
                    </>
                  ) : (
                    <>
                      <Bot size={12} /> AI отвечает
                    </>
                  )}
                </button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {activeChat.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-3 py-1.5 ${
                      m.fromMe ? "bg-brand-blue/80 text-white" : "bg-muted/60 text-foreground"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        m.fromMe ? "text-white/60" : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <form onSubmit={handleSend} className="border-t border-border/40 p-3 flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Напишите сообщение..."
                className="flex-1 rounded-xl bg-muted/50 px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
              />
              <Button type="submit" disabled={sending || !draft.trim()} className="rounded-xl gap-1.5">
                <Send size={14} /> Отправить
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
