"use client";

import { useState } from "react";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Насколько умный этот AI? Он не будет отвечать ерунду?",
    a: "AI обучается на данных вашего бизнеса — прайс-листе, FAQ, описании услуг. Он отвечает только в рамках заданных инструкций. Если вопрос выходит за рамки — AI вежливо переводит на менеджера. Перед запуском мы тестируем все сценарии вместе с вами.",
  },
  {
    q: "А если клиент задаст сложный вопрос?",
    a: "AI распознаёт сложные запросы и моментально передаёт диалог вам — с полным контекстом переписки. Вы подключаетесь в нужный момент, а не тратите время на типовые вопросы «сколько стоит» и «когда работаете».",
  },
  {
    q: "Сколько времени занимает настройка?",
    a: "Базовый бот запускается за 3 дня. Полная автоматизация с CRM, калькулятором цен и записью — 5-7 дней. Вам нужно только заполнить бриф и предоставить информацию о бизнесе. Всё остальное делаем мы.",
  },
  {
    q: "Какие мессенджеры поддерживаются?",
    a: "Telegram и WhatsApp — основные каналы. Также можно подключить Instagram Direct, VK и виджет на сайт. AI работает одинаково во всех каналах, а все обращения собираются в единую CRM.",
  },
  {
    q: "Сколько стоит ежемесячное обслуживание?",
    a: "Подписка от 30 000 ₸/мес включает: хостинг бота, обновления базы знаний, техподдержку и доработки. API-расходы (OpenAI) обычно составляют 3 000-10 000 ₸/мес в зависимости от объёма обращений.",
  },
  {
    q: "Можно ли попробовать бесплатно?",
    a: "Да! Попробуйте демо-бота прямо на этом сайте или в Telegram. А бесплатная 15-минутная консультация покажет, что именно можно автоматизировать в вашем бизнесе. Без обязательств.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "glass rounded-xl transition-all overflow-hidden",
        open && "ring-1 ring-primary/20"
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-medium pr-4">{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown size={18} className="text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  return (
    <section id="faq" className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Частые <span className="gradient-text">вопросы</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Ответы на то, что спрашивают чаще всего
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="mt-12 space-y-3" staggerDelay={0.08}>
          {faqs.map((faq) => (
            <StaggerItem key={faq.q}>
              <FAQItem q={faq.q} a={faq.a} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
