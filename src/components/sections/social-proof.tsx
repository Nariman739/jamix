"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { SOCIAL_PROOF } from "@/lib/constants";
import { CheckCircle2 } from "lucide-react";

export function SocialProofSection() {
  return (
    <section className="py-24 relative">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Уже <span className="gradient-text">работает</span> у клиентов
            </h2>
            <p className="mt-4 text-muted-foreground">
              Реальные бизнесы, которые используют AI-решения JamiX
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-4 md:grid-cols-3">
          {SOCIAL_PROOF.map((item, i) => (
            <FadeIn key={item.business} delay={0.1 + i * 0.1}>
              <div className="glass rounded-2xl p-6 glow-hover h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{item.emoji}</span>
                  <div>
                    <h3 className="text-sm font-semibold">{item.business}</h3>
                    <p className="text-xs text-muted-foreground">{item.city}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                  {item.what}
                </p>
                <div className="flex items-center gap-2 pt-3 border-t border-border/20">
                  <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                  <span className="text-xs font-medium text-green-400">
                    {item.result}
                  </span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
