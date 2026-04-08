"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { CASES } from "@/lib/constants";
import { Utensils, Stethoscope, ShoppingBag, Hammer, ArrowRight, CheckCircle2 } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Utensils,
  Stethoscope,
  ShoppingBag,
  Hammer,
};

export function CasesSection() {
  return (
    <section id="cases" className="py-24 relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Примеры <span className="gradient-text">решений</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Как AI и автоматизация решают реальные задачи бизнеса
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-6 sm:grid-cols-2">
          {CASES.map((caseItem, i) => {
            const Icon = iconMap[caseItem.icon];
            return (
              <FadeIn key={caseItem.industry} delay={0.1 + i * 0.1}>
                <div className="glass rounded-2xl p-6 glow-hover h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 flex items-center justify-center">
                      {Icon && <Icon size={20} className="text-brand-blue" />}
                    </div>
                    <h3 className="text-lg font-semibold">{caseItem.industry}</h3>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex gap-2">
                      <span className="text-red-400 text-sm font-medium shrink-0">Проблема:</span>
                      <p className="text-sm text-muted-foreground">{caseItem.problem}</p>
                    </div>
                    <div className="flex items-center text-muted-foreground/40">
                      <ArrowRight size={14} />
                    </div>
                    <div className="flex gap-2">
                      <span className="text-green-400 text-sm font-medium shrink-0">Решение:</span>
                      <p className="text-sm text-muted-foreground">{caseItem.solution}</p>
                    </div>
                  </div>

                  <div className="border-t border-border/30 pt-3 space-y-1.5">
                    {caseItem.results.map((result) => (
                      <div key={result} className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                        <span className="text-xs text-foreground/80">{result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
