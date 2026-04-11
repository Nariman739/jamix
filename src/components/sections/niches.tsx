"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { NICHES } from "@/lib/constants";
import { motion } from "framer-motion";

export function NichesSection() {
  return (
    <section id="niches" className="py-24 relative">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Для какого <span className="gradient-text">бизнеса</span> подходит
            </h2>
            <p className="mt-4 text-muted-foreground">
              AI-продавец работает в любой нише, где клиенты пишут в мессенджеры
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {NICHES.map((niche, i) => (
            <FadeIn key={niche.name} delay={0.05 + i * 0.05}>
              <motion.div
                whileHover={{ scale: 1.03 }}
                className="glass rounded-2xl p-5 text-center glow-hover h-full"
              >
                <span className="text-3xl block mb-3">{niche.emoji}</span>
                <h3 className="text-sm font-semibold mb-1">{niche.name}</h3>
                <p className="text-xs text-muted-foreground">{niche.example}</p>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
