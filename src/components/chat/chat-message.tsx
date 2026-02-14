"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function ChatMessage({
  role,
  text,
  buttons,
  onButtonClick,
}: {
  role: "user" | "bot";
  text: string;
  buttons?: { text: string; nextStep: number }[];
  onButtonClick?: (nextStep: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div className="max-w-[85%]">
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line",
            role === "user"
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "glass rounded-bl-md"
          )}
        >
          {text}
        </div>

        {buttons && buttons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {buttons.map((btn) => (
              <button
                key={btn.text}
                onClick={() => onButtonClick?.(btn.nextStep)}
                className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary transition-all hover:bg-primary/15 hover:border-primary/50 active:scale-95"
              >
                {btn.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
