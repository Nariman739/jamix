"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection({ onOpenChat }: { onOpenChat?: () => void }) {
  return (
    <section className="py-24 relative">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <FadeIn>
          <div className="gradient-border glass rounded-3xl p-10 sm:p-16 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl mb-4">
              Готовы <span className="gradient-text">автоматизировать</span>?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Расскажите о вашем бизнесе прямо сейчас — AI-консультант подберёт решение за 2 минуты. Это бесплатно.
            </p>
            <Button
              size="lg"
              className="group rounded-full px-8 text-base gap-2"
              onClick={onOpenChat}
            >
              Начать разговор
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
