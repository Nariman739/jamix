"use client";

import { motion } from "framer-motion";

interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
}

export function QuickReplies({ options, onSelect }: QuickRepliesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.3 }}
      className="flex flex-wrap gap-2 pt-2"
    >
      <p className="w-full text-xs text-muted-foreground mb-1">Выберите вашу нишу:</p>
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className="rounded-full border border-border/50 px-3 py-1.5 text-xs text-foreground/80 hover:bg-brand-blue/10 hover:border-brand-blue/30 hover:text-foreground transition-all"
        >
          {option}
        </button>
      ))}
    </motion.div>
  );
}
