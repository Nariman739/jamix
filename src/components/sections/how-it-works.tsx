"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";
import { MessageSquareText, Plug, Rocket } from "lucide-react";

const steps = [
  {
    icon: MessageSquareText,
    number: "01",
    title: "Расскажите о бизнесе",
    description:
      "Заполните бриф за 5 минут: ниша, услуги, цены, частые вопросы. Мы создадим AI-сотрудника под вашу специфику.",
  },
  {
    icon: Plug,
    number: "02",
    title: "Подключаем мессенджеры",
    description:
      "Бот подключается к вашему Telegram и WhatsApp. Клиенты пишут как обычно — AI отвечает моментально.",
  },
  {
    icon: Rocket,
    number: "03",
    title: "AI продаёт за вас",
    description:
      "Автоматические расчёты, запись на приём, CRM, дожимы. Вы получаете готовых клиентов.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Как это <span className="gradient-text">работает</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Три простых шага от идеи до работающего AI-сотрудника
            </p>
          </div>
        </FadeIn>

        <StaggerContainer
          className="mt-16 grid gap-8 md:grid-cols-3"
          staggerDelay={0.15}
        >
          {steps.map((step, i) => (
            <StaggerItem key={step.number}>
              <div className="group relative glass rounded-2xl p-6 sm:p-8 glow-hover">
                {/* Connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div className="absolute top-1/2 -right-4 hidden h-px w-8 bg-gradient-to-r from-border to-transparent md:block" />
                )}

                {/* Number */}
                <div className="mb-4 text-xs font-mono text-muted-foreground">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <step.icon size={24} className="text-primary" />
                </div>

                {/* Content */}
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
