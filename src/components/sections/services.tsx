"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { SERVICES } from "@/lib/constants";
import { motion } from "framer-motion";

export function ServicesSection({ onOpenChat }: { onOpenChat?: (message: string) => void }) {
  return (
    <section id="services" className="py-24 relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Что мы <span className="gradient-text">делаем</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              5 направлений автоматизации. Нажмите — обсудим подробнее.
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <FadeIn key={service.id} delay={0.1 + i * 0.08}>
              <motion.button
                onClick={() => onOpenChat?.(service.chatMessage)}
                className="glass rounded-2xl p-6 text-left w-full glow-hover group cursor-pointer h-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-3xl block mb-4">{service.emoji}</span>
                <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {service.description}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  {service.examples}
                </p>
                <span className="mt-4 inline-flex items-center text-xs text-brand-blue group-hover:text-brand-cyan transition-colors">
                  Обсудить →
                </span>
              </motion.button>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
