"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { SERVICES } from "@/lib/constants";
import { Send, MessageCircle, Database, Brain, Workflow, Code } from "lucide-react";
import { motion } from "framer-motion";

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Send,
  MessageCircle,
  Database,
  Brain,
  Workflow,
  Code,
};

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
              6 направлений автоматизации. Нажмите на карточку — консультант расскажет подробнее.
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => {
            const Icon = iconMap[service.icon];
            return (
              <FadeIn key={service.id} delay={0.1 + i * 0.08}>
                <motion.button
                  onClick={() => onOpenChat?.(service.chatMessage)}
                  className="glass rounded-2xl p-6 text-left w-full glow-hover group cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 flex items-center justify-center mb-4 group-hover:from-brand-blue/30 group-hover:to-brand-purple/30 transition-colors">
                    {Icon && <Icon size={24} className="text-brand-blue" />}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                  <span className="mt-4 inline-flex items-center text-xs text-brand-blue group-hover:text-brand-cyan transition-colors">
                    Узнать больше →
                  </span>
                </motion.button>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
