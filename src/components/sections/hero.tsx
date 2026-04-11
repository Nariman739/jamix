"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { DEMO_CHAT, RESULTS, SITE } from "@/lib/constants";
import { ArrowRight, Send } from "lucide-react";
import { motion } from "framer-motion";

function ChatPreview() {
  const [visibleCount, setVisibleCount] = useState(0);
  const messages = DEMO_CHAT.slice(0, 4);

  useEffect(() => {
    if (visibleCount >= messages.length) return;
    const timer = setTimeout(
      () => setVisibleCount((prev) => prev + 1),
      visibleCount === 0 ? 1000 : 1500
    );
    return () => clearTimeout(timer);
  }, [visibleCount, messages.length]);

  return (
    <div className="glass rounded-2xl p-4 w-full max-w-[360px] space-y-3">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/30">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">AI</span>
        </div>
        <span className="text-xs font-medium">AI-продавец</span>
        <span className="ml-auto h-2 w-2 rounded-full bg-green-500" />
      </div>
      {messages.slice(0, visibleCount).map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex ${msg.role === "client" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`rounded-2xl px-3 py-2 text-xs max-w-[85%] ${
              msg.role === "client"
                ? "bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-br-sm"
                : "bg-muted/60 text-foreground/80 rounded-bl-sm"
            }`}
          >
            {msg.text}
          </div>
        </motion.div>
      ))}
      {visibleCount < messages.length && visibleCount > 0 && (
        <div className="flex items-center gap-1 px-3">
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-brand-blue" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-brand-blue" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-brand-blue" />
        </div>
      )}
    </div>
  );
}

export function HeroSection({ onOpenChat }: { onOpenChat?: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="hero-gradient" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: text */}
          <div className="flex-1 text-center lg:text-left">
            <FadeIn delay={0.1}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Бесплатный разбор для вашего бизнеса
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-tight">
                AI-продавец, который{" "}
                <span className="gradient-text">закрывает заявки</span>{" "}
                за вас
              </h1>
            </FadeIn>

            <FadeIn delay={0.4}>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Бот в WhatsApp и Telegram, который отвечает клиентам за 3 секунды, консультирует, считает стоимость и записывает — 24/7, без выходных.
              </p>
            </FadeIn>

            <FadeIn delay={0.6}>
              <div className="mt-8 flex flex-col items-center lg:items-start gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="group relative rounded-full px-8 text-base gap-2 overflow-hidden"
                  onClick={onOpenChat}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  Попробовать AI-продавца
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 text-base gap-2"
                  asChild
                >
                  <a href={SITE.telegramBot} target="_blank" rel="noopener noreferrer">
                    <Send size={18} />
                    Написать в Telegram
                  </a>
                </Button>
              </div>
            </FadeIn>

            <FadeIn delay={0.8}>
              <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {RESULTS.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 + i * 0.12, duration: 0.4 }}
                    className="glass rounded-xl px-3 py-4 glow-hover text-center"
                  >
                    <div className="text-xl font-bold">{stat.value}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Right: chat preview */}
          <FadeIn delay={0.5} className="hidden lg:flex flex-shrink-0">
            <ChatPreview />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
