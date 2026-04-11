"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { HOW_IT_WORKS } from "@/lib/constants";
import { MessageSquare, Settings, Rocket } from "lucide-react";

const icons = [MessageSquare, Settings, Rocket];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Как это <span className="gradient-text">работает</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              От заявки до запуска — 3 простых шага
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-8 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = icons[i];
            return (
              <FadeIn key={step.step} delay={0.1 + i * 0.15}>
                <div className="relative glass rounded-2xl p-8 text-center glow-hover">
                  <div className="text-5xl font-black text-brand-purple/10 absolute top-4 right-6">
                    {step.step}
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center mx-auto mb-5">
                    <Icon size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
