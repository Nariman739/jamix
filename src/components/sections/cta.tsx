"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";
import { ArrowRight, Send } from "lucide-react";
import { trackContact } from "@/lib/meta-pixel";

export function CTASection({ onOpenChat }: { onOpenChat?: () => void }) {
  return (
    <section className="py-24 relative">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <FadeIn>
          <div className="gradient-border glass rounded-3xl p-10 sm:p-16 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl mb-4">
              Получите <span className="gradient-text">бесплатный разбор</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Расскажите про ваш бизнес — покажем, как AI-продавец увеличит ваши продажи. Это бесплатно и ни к чему не обязывает.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button
                size="lg"
                className="group rounded-full px-8 text-base gap-2"
                onClick={onOpenChat}
              >
                Попробовать AI-продавца
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 text-base gap-2"
                asChild
              >
                <a href={SITE.telegramBot} target="_blank" rel="noopener noreferrer" onClick={trackContact}>
                  <Send size={18} />
                  Написать в Telegram
                </a>
              </Button>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
