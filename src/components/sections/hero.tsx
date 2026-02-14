"use client";

import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { SITE } from "@/lib/constants";
import { ArrowRight, Bot, Clock, Zap } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { icon: Bot, value: "24/7", label: "Без выходных" },
  { icon: Zap, value: "< 3 сек", label: "Время ответа" },
  { icon: Clock, value: "3 дня", label: "Запуск" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated gradient background */}
      <div className="hero-gradient" />

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

        {/* Headline */}
        <FadeIn delay={0.2}>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            AI-сотрудник для{" "}
            <span className="gradient-text">вашего бизнеса</span>
          </h1>
        </FadeIn>

        {/* Subheadline */}
        <FadeIn delay={0.4}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            {SITE.description}
          </p>
        </FadeIn>

        {/* CTA Buttons */}
        <FadeIn delay={0.6}>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 text-base gap-2"
            >
              <a href="#demo">
                Попробовать демо
                <ArrowRight size={18} />
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
          <div className="mt-16 grid grid-cols-3 gap-4 sm:gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.15, duration: 0.4 }}
                className="glass rounded-2xl px-4 py-5 sm:px-6 sm:py-6"
              >
                <stat.icon
                  size={24}
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
    </section>
  );
}
