"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { Check, X } from "lucide-react";

const rows = [
  { feature: "Время ответа клиенту", without: "5-30 минут", with: "< 3 секунды" },
  { feature: "Работает ночью и в выходные", without: false, with: true },
  { feature: "Забывает про клиента", without: true, with: false },
  { feature: "Одновременно обслуживает", without: "1-2 клиента", with: "1000+ клиентов" },
  { feature: "Стоимость в месяц", without: "300 000+ ₸", with: "от 0 ₸ после запуска" },
  { feature: "Ошибки в расчётах", without: "Бывают", with: "Никогда" },
  { feature: "Масштабируется", without: "Нанять ещё людей", with: "Автоматически" },
];

export function ComparisonSection() {
  return (
    <section className="py-24 relative">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Без автоматизации <span className="gradient-text">vs с JAMX</span>
            </h2>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 text-sm font-semibold border-b border-border/30">
              <div className="p-4" />
              <div className="p-4 text-center text-red-400/80">Без автоматизации</div>
              <div className="p-4 text-center text-green-400">С JAMX</div>
            </div>
            {rows.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 text-sm ${
                  i < rows.length - 1 ? "border-b border-border/20" : ""
                }`}
              >
                <div className="p-4 text-foreground/80">{row.feature}</div>
                <div className="p-4 text-center text-muted-foreground">
                  {typeof row.without === "boolean" ? (
                    row.without ? (
                      <X size={18} className="mx-auto text-red-400/60" />
                    ) : (
                      <Check size={18} className="mx-auto text-green-400/60" />
                    )
                  ) : (
                    row.without
                  )}
                </div>
                <div className="p-4 text-center">
                  {typeof row.with === "boolean" ? (
                    row.with ? (
                      <X size={18} className="mx-auto text-red-400/60" />
                    ) : (
                      <Check size={18} className="mx-auto text-green-400" />
                    )
                  ) : (
                    <span className="text-green-400 font-medium">{row.with}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
