"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { Shield, Clock, HeadphonesIcon, Rocket } from "lucide-react";

const trustPoints = [
  {
    icon: Rocket,
    title: "Запуск за 3-5 дней",
    description: "Не месяцы ожидания. Быстрый старт — быстрый результат.",
  },
  {
    icon: HeadphonesIcon,
    title: "Поддержка до 3 месяцев",
    description: "Не бросаем после запуска. Обучаем, помогаем, дорабатываем.",
  },
  {
    icon: Shield,
    title: "Всё под ключ",
    description: "От анализа до запуска — одна команда. Без субподрядчиков.",
  },
  {
    icon: Clock,
    title: "На связи в рабочее время",
    description: "Астана, Казахстан. Отвечаем в течение 2 часов.",
  },
];

const techLogos = [
  { name: "Telegram", icon: "📱" },
  { name: "WhatsApp", icon: "💬" },
  { name: "AmoCRM", icon: "📊" },
  { name: "n8n", icon: "⚡" },
  { name: "Claude AI", icon: "🧠" },
  { name: "Next.js", icon: "▲" },
];

export function TrustSection() {
  return (
    <section className="py-24 relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* About */}
        <FadeIn>
          <div className="glass rounded-3xl p-8 sm:p-12 mb-16">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <h2 className="text-3xl font-bold sm:text-4xl mb-4">
                  Почему <span className="gradient-text">JamiX</span>?
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Мы — AI-агентство из Астаны. Основатель Нариман — разработчик и специалист по автоматизации.
                  Не перепродаём чужие решения, а создаём с нуля под ваш бизнес.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Работаем с ресторанами, клиниками, салонами, магазинами и сервисными компаниями по всему Казахстану.
                  Каждый проект — индивидуальный подход, не шаблон.
                </p>
              </div>
              <div className="shrink-0">
                <div className="h-32 w-32 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-5xl font-black text-white">
                  N
                </div>
                <p className="text-center mt-3 text-sm font-medium">Нариман</p>
                <p className="text-center text-xs text-muted-foreground">Основатель JamiX</p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Trust points */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-16">
          {trustPoints.map((point, i) => (
            <FadeIn key={point.title} delay={0.1 + i * 0.08}>
              <div className="glass rounded-2xl p-6 text-center glow-hover h-full">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 flex items-center justify-center mx-auto mb-4">
                  <point.icon size={22} className="text-brand-blue" />
                </div>
                <h3 className="text-sm font-semibold mb-2">{point.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{point.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Tech stack */}
        <FadeIn>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-6">Технологии, которые мы используем</p>
            <div className="flex flex-wrap justify-center gap-4">
              {techLogos.map((tech) => (
                <div
                  key={tech.name}
                  className="glass rounded-xl px-4 py-3 flex items-center gap-2 text-sm"
                >
                  <span className="text-lg">{tech.icon}</span>
                  <span className="text-muted-foreground">{tech.name}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
