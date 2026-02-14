"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/components/chat/chat-message";
import { TypingDots } from "@/components/motion/typing-effect";
import { useLiveChat } from "@/hooks/use-live-chat";
import { RotateCcw, Send, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GREETING: Record<string, string> = {
  restaurant:
    "Здравствуйте! Добро пожаловать в ресторан «Восток». Чем могу помочь? Могу забронировать стол, показать меню или оформить доставку.",
  salon:
    "Здравствуйте! Салон красоты «Элит». Рады видеть вас! Хотите записаться на процедуру или узнать цены?",
  clinic:
    "Здравствуйте! Медицинский центр «Здоровье». Чем могу помочь? Могу записать к врачу или рассказать о наших услугах.",
  shop:
    "Привет! Магазин электроники TechZone. Помогу подобрать идеальный гаджет. Что ищете?",
};

export function LiveChatWidget({ industry }: { industry: string }) {
  const { messages, isLoading, sendMessage, reset } = useLiveChat(industry);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const greeting = GREETING[industry] || GREETING.restaurant;

  return (
    <div className="mx-auto w-full max-w-sm">
      {/* Phone frame */}
      <div className="rounded-[2.5rem] border border-border/50 bg-background p-2 shadow-2xl">
        {/* Notch */}
        <div className="flex items-center justify-between rounded-t-[2rem] bg-muted/30 px-6 py-3">
          <span className="text-xs text-muted-foreground">9:41</span>
          <div className="h-5 w-20 rounded-full bg-background" />
          <div className="flex items-center gap-1">
            <Wifi size={12} className="text-muted-foreground" />
            <div className="h-3 w-5 rounded-sm border border-muted-foreground/50 p-px">
              <div className="h-full w-3/4 rounded-xs bg-green-500" />
            </div>
          </div>
        </div>

        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border/30 bg-muted/20 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <span className="text-xs font-bold gradient-text">AI</span>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">JamiX AI</div>
            <div className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              <span className="text-xs text-green-500">живой AI</span>
            </div>
          </div>
          <button
            onClick={reset}
            className="text-muted-foreground transition-colors hover:text-foreground"
            title="Начать заново"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex flex-col gap-3 overflow-y-auto p-4 h-80 sm:h-96"
        >
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[85%]">
              <div className="glass rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed">
                {greeting}
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role === "assistant" ? "bot" : "user"}
                text={msg.content}
              />
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="glass rounded-2xl rounded-bl-md">
                <TypingDots />
              </div>
            </motion.div>
          )}
        </div>

        {/* Input bar - LIVE */}
        <div className="flex items-center gap-2 border-t border-border/30 px-3 py-3 rounded-b-[2rem]">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение..."
            disabled={isLoading}
            className="flex-1 rounded-full bg-muted/50 px-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
