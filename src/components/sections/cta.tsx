"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";
import { Send, MessageCircle } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-[400px] w-[400px] rounded-full bg-brand-blue/15 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-brand-purple/15 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <FadeIn>
          <h2 className="text-3xl font-bold sm:text-4xl md:text-5xl">
            Готовы <span className="gradient-text">автоматизировать</span>{" "}
            продажи?
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground">
            Попробуйте бесплатную демо-версию AI-сотрудника прямо в Telegram.
            Убедитесь сами за 2 минуты.
          </p>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 text-base gap-2"
            >
              <a
                href={SITE.telegramBot}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send size={18} />
                Запустить демо в Telegram
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8 text-base gap-2"
            >
              <a
                href={SITE.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} />
                Написать в WhatsApp
              </a>
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.6}>
          <p className="mt-6 text-sm text-muted-foreground">
            Бесплатная консультация — 15 минут. Расскажу, что можно автоматизировать в вашем бизнесе.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
