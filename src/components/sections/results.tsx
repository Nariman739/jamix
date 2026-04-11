"use client";

import { FadeIn } from "@/components/motion/fade-in";
import { RESULTS } from "@/lib/constants";
import { motion } from "framer-motion";

export function ResultsSection() {
  return (
    <section id="results" className="py-24 relative">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Что вы <span className="gradient-text">получаете</span>
            </h2>
          </div>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RESULTS.map((result, i) => (
            <FadeIn key={result.label} delay={0.1 + i * 0.1}>
              <motion.div
                whileHover={{ scale: 1.03 }}
                className="glass rounded-2xl p-6 text-center glow-hover h-full"
              >
                <div className="text-3xl font-black gradient-text mb-2">
                  {result.value}
                </div>
                <h3 className="text-sm font-semibold mb-1">{result.label}</h3>
                <p className="text-xs text-muted-foreground">{result.description}</p>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
