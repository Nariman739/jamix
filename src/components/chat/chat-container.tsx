"use client";

import { useRef, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { QuickReplies } from "./quick-replies";
import type { ChatMessage } from "@/hooks/use-live-chat";

interface ChatContainerProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (text: string) => void;
}

const GREETING = "Привет! Я консультант JAMX. Расскажите немного о себе — чем занимаетесь? Я помогу разобраться, что в вашем бизнесе можно автоматизировать и где AI реально сэкономит время.";

const QUICK_REPLY_OPTIONS = [
  "Клиенты пишут, не успеваю отвечать",
  "Много рутины, всё вручную",
  "Хочу бота для клиентов",
  "Теряются заявки и лиды",
  "Просто интересуюсь, что вы делаете",
];

export function ChatContainer({ messages, isStreaming, onSendMessage }: ChatContainerProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input);
    setInput("");
    // Refocus input after send
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleQuickReply = (text: string) => {
    onSendMessage(text);
  };

  const showGreeting = messages.length === 0;
  const showQuickReplies = messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col bg-background/95 h-[500px] max-md:h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {showGreeting && (
          <MessageBubble role="assistant" content={GREETING} />
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
          />
        ))}

        {/* Typing indicator */}
        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-1.5 px-4 py-3 glass rounded-2xl rounded-bl-sm w-fit">
            <span className="typing-dot h-2 w-2 rounded-full bg-brand-blue" />
            <span className="typing-dot h-2 w-2 rounded-full bg-brand-blue" />
            <span className="typing-dot h-2 w-2 rounded-full bg-brand-blue" />
          </div>
        )}

        {showQuickReplies && (
          <QuickReplies options={QUICK_REPLY_OPTIONS} onSelect={handleQuickReply} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-border/30 p-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Напишите сообщение..."
          disabled={isStreaming}
          className="flex-1 rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-brand-blue/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="rounded-xl bg-gradient-to-r from-brand-blue to-brand-purple p-2.5 text-white disabled:opacity-30 hover:opacity-90 transition-opacity"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
