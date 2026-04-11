"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { PROBLEMS } from "@/lib/constants";

export function ProblemsSection() {
  return (
    <section className="py-24 relative">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Знакомо? <span className="gradient-text">Это стоит вам денег</span>
            </h2>
          </div>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2">
          {PROBLEMS.map((problem, i) => (
            <FadeIn key={problem.title} delay={0.1 + i * 0.1}>
              <div className="glass rounded-2xl p-6 glow-hover h-full flex gap-4 items-start">
                <span className="text-3xl shrink-0">{problem.emoji}</span>
                <div>
                  <h3 className="text-base font-semibold mb-1">{problem.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {problem.description}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
