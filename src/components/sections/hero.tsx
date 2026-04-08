"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ArrowRight, Bot, Clock, TrendingUp, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const stats = [
  { icon: Bot, value: "24/7", label: "Без выходных" },
  { icon: Zap, value: "< 3 сек", label: "Время ответа" },
  { icon: Clock, value: "3-5 дней", label: "Запуск" },
  { icon: TrendingUp, value: "+40%", label: "Рост продаж" },
];

const rotatingWords = [
  "ресторана",
  "салона красоты",
  "клиники",
  "магазина",
  "автосервиса",
  "вашего бизнеса",
];

const chatPreview = [
  { role: "user", text: "Привет, у меня салон красоты, 5 мастеров" },
  { role: "bot", text: "Отлично! Какие задачи хотите автоматизировать — запись клиентов, напоминания, или что-то другое?" },
  { role: "user", text: "Запись и напоминания, клиенты забывают" },
  { role: "bot", text: "Понял. Рекомендую Telegram-бот с автозаписью + напоминания за 2 часа. Запуск за 5 дней." },
];

function RotatingText() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-block relative h-[1.15em] overflow-hidden align-bottom">
      <AnimatePresence mode="wait">
        <motion.span
          key={rotatingWords[index]}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="gradient-text inline-block"
        >
          {rotatingWords[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function ChatPreview() {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= chatPreview.length) return;
    const timer = setTimeout(() => {
      setVisibleCount((prev) => prev + 1);
    }, visibleCount === 0 ? 1000 : 1500);
    return () => clearTimeout(timer);
  }, [visibleCount]);

  return (
    <div className="glass rounded-2xl p-4 w-full max-w-[340px] space-y-3">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/30">
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple" />
        <span className="text-xs font-medium">JAMX Консультант</span>
        <span className="ml-auto h-2 w-2 rounded-full bg-green-500" />
      </div>
      {chatPreview.slice(0, visibleCount).map((msg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`rounded-2xl px-3 py-2 text-xs max-w-[85%] ${
              msg.role === "user"
                ? "bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-br-sm"
                : "bg-muted/60 text-foreground/80 rounded-bl-sm"
            }`}
          >
            {msg.text}
          </div>
        </motion.div>
      ))}
      {visibleCount < chatPreview.length && visibleCount > 0 && (
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
                AI-агентство в Казахстане
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-tight">
                AI-решения для
                <br />{" "}
                <RotatingText />
              </h1>
            </FadeIn>

            <FadeIn delay={0.4}>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                Расскажите о вашем бизнесе — наш AI-консультант подберёт решение за 2 минуты. Боты, CRM, автоматизация — всё под ключ.
              </p>
            </FadeIn>

            <FadeIn delay={0.6}>
              <div className="mt-8 flex flex-col items-center lg:items-start gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="group relative rounded-full px-8 text-base gap-2 overflow-hidden"
                  onClick={onOpenChat}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  Получить консультацию бесплатно
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </FadeIn>

            <FadeIn delay={0.8}>
              <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 + i * 0.12, duration: 0.4 }}
                    className="glass rounded-xl px-3 py-4 glow-hover text-center"
                  >
                    <stat.icon size={18} className="mx-auto mb-1.5 text-brand-purple" />
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
