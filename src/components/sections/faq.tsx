"use client";

import { useState } from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { FAQ_ITEMS } from "@/lib/constants";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="w-full text-left glass rounded-xl p-5 glow-hover"
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-medium sm:text-base">{question}</h3>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-muted-foreground shrink-0" />
        </motion.div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

export function FAQSection({ onOpenChat }: { onOpenChat?: () => void }) {
  return (
    <section id="faq" className="py-24 relative">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Частые <span className="gradient-text">вопросы</span>
            </h2>
          </div>
        </FadeIn>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <FadeIn key={item.question} delay={0.05 + i * 0.05}>
              <FAQItem question={item.question} answer={item.answer} />
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.4}>
          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">Остались вопросы?</p>
            <button
              onClick={onOpenChat}
              className="rounded-full border border-brand-blue/30 bg-brand-blue/10 px-6 py-2.5 text-sm text-brand-blue hover:bg-brand-blue/20 transition-colors"
            >
              Спросить AI-продавца
            </button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
