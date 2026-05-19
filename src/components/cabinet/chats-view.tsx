"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Pause, Play, MessageSquare, Bot, ArrowLeft, ShieldOff, MoreVertical } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
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
    if (!activeChatId) {
      setActiveChat(null);
      return;
    }
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

  const blockContact = async () => {
    if (!activeChat) return;
    if (!confirm("Внести этот контакт в список 'Не писать'? Бот больше не будет ему отвечать и нельзя будет отправлять сообщения.")) return;
    const phoneNumber = activeChat.chat.phoneNumber || activeChat.chat.remoteJid.split("@")[0];
    await fetch(`/api/v1/wa/instances/${instanceId}/dnc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    });
    setMenuOpen(false);
    // After blocking — close active chat
    setActiveChatId(null);
    void loadChats();
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const showList = !activeChatId;
  const showChat = !!activeChatId;

  return (
    <div className="glass rounded-2xl md:grid md:grid-cols-[280px_1fr] md:h-[calc(100vh-280px)] md:min-h-[500px] overflow-hidden">
      {/* Sidebar — на мобиле показывается только когда чат не выбран */}
      <aside
        className={`border-b md:border-b-0 md:border-r border-border/40 md:overflow-y-auto ${
          showList ? "block" : "hidden md:block"
        } h-[calc(100vh-200px)] md:h-auto overflow-y-auto`}
      >
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

      {/* Main — active chat. На мобиле fullscreen когда выбран */}
      <main
        className={`flex flex-col overflow-hidden ${
          showChat ? "flex" : "hidden md:flex"
        } h-[calc(100vh-200px)] md:h-auto`}
      >
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
              <p>Выберите переписку слева</p>
            </div>
          </div>
        ) : (
          <>
            <header className="px-3 py-3 border-b border-border/40 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setActiveChatId(null)}
                className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground"
                aria-label="К списку"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {activeChat.chat.name ||
                    (activeChat.chat.phoneNumber
                      ? `+${activeChat.chat.phoneNumber}`
                      : activeChat.chat.remoteJid.split("@")[0])}
                </div>
                {activeChat.chat.name && activeChat.chat.phoneNumber && (
                  <div className="text-xs text-muted-foreground truncate">
                    +{activeChat.chat.phoneNumber}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {aiEnabled && (
                  <button
                    type="button"
                    onClick={togglePause}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full transition whitespace-nowrap ${
                      activeChat.chat.aiPaused
                        ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                    }`}
                    title={
                      activeChat.chat.aiPaused
                        ? "Возобновить автоответы бота для этого чата"
                        : "Поставить бота на паузу — будешь отвечать вручную"
                    }
                  >
                    {activeChat.chat.aiPaused ? (
                      <>
                        <Play size={12} />
                        <span className="hidden sm:inline">Вернуть AI</span>
                        <span className="sm:hidden">AI off</span>
                      </>
                    ) : (
                      <>
                        <Bot size={12} />
                        <span className="hidden sm:inline">AI отвечает</span>
                        <span className="sm:hidden">AI on</span>
                      </>
                    )}
                  </button>
                )}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    aria-label="Меню"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {menuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 z-20 rounded-xl bg-background border border-border/60 shadow-lg overflow-hidden min-w-[200px]">
                        <button
                          type="button"
                          onClick={blockContact}
                          className="w-full text-left px-3 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                        >
                          <ShieldOff size={14} />
                          <span>Внести в «Не писать»</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
              {activeChat.messages.map((m) => (
                <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-1.5 ${
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

            <form onSubmit={handleSend} className="border-t border-border/40 p-2.5 flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Напишите сообщение..."
                className="flex-1 rounded-xl bg-muted/50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
              />
              <Button type="submit" disabled={sending || !draft.trim()} className="rounded-xl gap-1.5 px-3">
                <Send size={14} />
                <span className="hidden sm:inline">Отправить</span>
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
