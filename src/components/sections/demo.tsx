"use client";

import { useEffect, useState } from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { DEMO_CHAT, SITE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

function DemoChat() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= DEMO_CHAT.length) return;
    const delay = visibleCount === 0 ? 800 : 1200;
    const timer = setTimeout(() => {
      setVisibleCount((prev) => prev + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  return (
    <div className="mx-auto max-w-md">
      {/* Chat header */}
      <div className="glass-strong rounded-t-2xl px-4 py-3 flex items-center gap-3 border-b border-border/30">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center">
          <span className="text-white text-sm font-bold">AI</span>
        </div>
        <div>
          <p className="text-sm font-semibold">AI-продавец</p>
          <p className="text-xs text-green-400">онлайн</p>
        </div>
      </div>

      {/* Messages */}
      <div className="glass rounded-b-2xl p-4 space-y-3 min-h-[320px]">
        {DEMO_CHAT.slice(0, visibleCount).map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.role === "client" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm max-w-[85%] ${
                msg.role === "client"
                  ? "bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-br-sm"
                  : "bg-muted/60 text-foreground/90 rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}

        {/* Typing indicator */}
        {visibleCount > 0 && visibleCount < DEMO_CHAT.length && (
          <div className="flex items-center gap-1.5 px-3 py-1">
            <span className="typing-dot h-2 w-2 rounded-full bg-brand-blue" />
            <span className="typing-dot h-2 w-2 rounded-full bg-brand-blue" />
            <span className="typing-dot h-2 w-2 rounded-full bg-brand-blue" />
          </div>
        )}

        {/* Replay button */}
        {visibleCount >= DEMO_CHAT.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center pt-2"
          >
            <button
              onClick={() => setVisibleCount(0)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ↻ Посмотреть ещё раз
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export function DemoSection({ onOpenChat }: { onOpenChat?: () => void }) {
  return (
    <section className="py-24 relative">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Вот как <span className="gradient-text">AI-продавец</span> общается с клиентом
            </h2>
            <p className="mt-4 text-muted-foreground">
              Реальный пример: клиент спрашивает про натяжной потолок
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <DemoChat />
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="mt-10 text-center space-y-4">
            <p className="text-lg font-medium">
              30 секунд — и клиент записан. Без менеджера.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button
                size="lg"
                className="rounded-full px-8 gap-2"
                onClick={onOpenChat}
              >
                Попробовать AI-продавца
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 gap-2"
                asChild
              >
                <a href={SITE.telegramBot} target="_blank" rel="noopener noreferrer">
                  <Send size={18} />
                  Написать в Telegram
                </a>
              </Button>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
