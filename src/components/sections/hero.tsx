"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { SITE } from "@/lib/constants";
import { ArrowRight, Bot, Clock, TrendingUp, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const stats = [
  { icon: Bot, value: "24/7", label: "Без выходных" },
  { icon: Zap, value: "< 3 сек", label: "Время ответа" },
  { icon: Clock, value: "3 дня", label: "Запуск" },
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

const floatingMessages = [
  { text: "Хочу записаться на завтра", x: "8%", y: "18%", delay: 0 },
  { text: "Сколько стоит?", x: "75%", y: "12%", delay: 1.5 },
  { text: "Есть свободные окна?", x: "5%", y: "72%", delay: 3 },
  { text: "Бронь подтверждена!", x: "70%", y: "75%", delay: 4.5 },
  { text: "Спасибо, очень удобно!", x: "82%", y: "45%", delay: 6 },
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

function FloatingBubbles() {
  return (
    <>
      {floatingMessages.map((msg, i) => (
        <motion.div
          key={i}
          className="absolute hidden md:block pointer-events-none"
          style={{ left: msg.x, top: msg.y }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: [0, 0.6, 0.6, 0],
            scale: [0.8, 1, 1, 0.9],
            y: [0, -10, -10, -20],
          }}
          transition={{
            duration: 6,
            delay: msg.delay,
            repeat: Infinity,
            repeatDelay: floatingMessages.length * 1.5 - 6 + msg.delay,
          }}
        >
          <div className="glass rounded-2xl px-3 py-2 text-xs text-muted-foreground shadow-lg max-w-[160px]">
            {msg.text}
          </div>
        </motion.div>
      ))}
    </>
  );
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated gradient background */}
      <div className="hero-gradient" />

      {/* Floating chat bubbles */}
      <FloatingBubbles />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6">
        {/* Badge */}
        <FadeIn delay={0.1}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Автоматизация бизнеса с AI
          </div>
        </FadeIn>

        {/* Headline with rotating words */}
        <FadeIn delay={0.2}>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl leading-tight">
            AI-сотрудник для
            <br className="sm:hidden" />{" "}
            <RotatingText />
          </h1>
        </FadeIn>

        {/* Subheadline */}
        <FadeIn delay={0.4}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            {SITE.description}
          </p>
        </FadeIn>

        {/* CTA Buttons with shimmer */}
        <FadeIn delay={0.6}>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="group relative rounded-full px-8 text-base gap-2 overflow-hidden"
            >
              <a href="#demo">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                Попробовать демо
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8 text-base"
            >
              <a
                href={SITE.telegramBot}
                target="_blank"
                rel="noopener noreferrer"
              >
                Написать в Telegram
              </a>
            </Button>
          </div>
        </FadeIn>

        {/* Stats */}
        <FadeIn delay={0.8}>
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.12, duration: 0.4 }}
                className="glass rounded-2xl px-4 py-5 sm:px-6 sm:py-6 glow-hover"
              >
                <stat.icon
                  size={22}
                  className="mx-auto mb-2 text-brand-purple"
                />
                <div className="text-2xl font-bold sm:text-3xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </FadeIn>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">Листайте вниз</span>
          <div className="h-8 w-5 rounded-full border border-muted-foreground/30 p-1">
            <motion.div
              className="h-2 w-full rounded-full bg-primary"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
