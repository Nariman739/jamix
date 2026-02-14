"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const rows = [
  { feature: "Время ответа", human: "5-30 мин", ai: "< 3 секунды", advantage: "ai" },
  { feature: "Работает в выходные", human: "Нет", ai: "24/7/365", advantage: "ai" },
  { feature: "Одновременных диалогов", human: "1-3", ai: "Безлимит", advantage: "ai" },
  { feature: "Ошибки от усталости", human: "Часто", ai: "Никогда", advantage: "ai" },
  { feature: "Забывает перезвонить", human: "Бывает", ai: "Никогда", advantage: "ai" },
  { feature: "Считает стоимость", human: "3-5 мин", ai: "Мгновенно", advantage: "ai" },
  { feature: "Запись в CRM", human: "Вручную", ai: "Автоматически", advantage: "ai" },
  { feature: "Зарплата в месяц", human: "250 000+ ₸", ai: "от 30 000 ₸", advantage: "ai" },
  { feature: "Эмпатия и креативность", human: "Да", ai: "Базовая", advantage: "human" },
  { feature: "Сложные переговоры", human: "Да", ai: "Передаёт вам", advantage: "human" },
];

export function ComparisonSection() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 right-0 h-[400px] w-[400px] rounded-full bg-brand-blue/8 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Менеджер <span className="text-muted-foreground">vs</span>{" "}
              <span className="gradient-text">AI-сотрудник</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              AI не заменяет людей — он берёт на себя рутину, чтобы вы
              фокусировались на главном
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mt-12 overflow-hidden rounded-2xl border border-border/50">
            {/* Header */}
            <div className="grid grid-cols-3 bg-muted/30">
              <div className="px-4 py-4 sm:px-6 text-sm font-semibold text-muted-foreground">
                Параметр
              </div>
              <div className="px-4 py-4 sm:px-6 text-sm font-semibold text-center">
                Менеджер
              </div>
              <div className="px-4 py-4 sm:px-6 text-sm font-semibold text-center gradient-text">
                JamiX AI
              </div>
            </div>

            {/* Rows */}
            {rows.map((row, i) => (
              <div
                key={row.feature}
                className={cn(
                  "grid grid-cols-3 border-t border-border/30 transition-colors hover:bg-muted/10",
                  row.advantage === "ai" && "hover:bg-primary/3"
                )}
              >
                <div className="px-4 py-3.5 sm:px-6 text-sm">
                  {row.feature}
                </div>
                <div
                  className={cn(
                    "px-4 py-3.5 sm:px-6 text-sm text-center flex items-center justify-center gap-1.5",
                    row.advantage === "human"
                      ? "text-green-400"
                      : "text-muted-foreground"
                  )}
                >
                  {row.advantage === "human" ? (
                    <Check size={14} className="text-green-400" />
                  ) : row.human === "Нет" || row.human === "Часто" || row.human === "Бывает" ? (
                    <X size={14} className="text-red-400/70" />
                  ) : (
                    <Minus size={14} className="text-muted-foreground/50" />
                  )}
                  {row.human}
                </div>
                <div
                  className={cn(
                    "px-4 py-3.5 sm:px-6 text-sm text-center flex items-center justify-center gap-1.5 font-medium",
                    row.advantage === "ai"
                      ? "text-green-400"
                      : "text-muted-foreground"
                  )}
                >
                  {row.advantage === "ai" ? (
                    <Check size={14} className="text-green-400" />
                  ) : (
                    <Minus size={14} className="text-muted-foreground/50" />
                  )}
                  {row.ai}
                </div>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            AI обрабатывает 80% типовых обращений. Сложные вопросы передаёт вам
            — с полным контекстом диалога.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
