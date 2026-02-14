"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/components/chat/chat-message";
import { TypingDots } from "@/components/motion/typing-effect";
import { useChat } from "@/hooks/use-chat";
import { type ChatScenario } from "@/components/chat/chat-scenarios";
import { RotateCcw, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ChatWidget({ scenario }: { scenario: ChatScenario }) {
  const {
    messages,
    isTyping,
    isComplete,
    handleButtonClick,
    start,
    reset,
  } = useChat(scenario);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  // Auto-start when scenario changes
  useEffect(() => {
    hasStarted.current = false;
  }, [scenario.id]);

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      start();
    }
  }, [scenario.id, start]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping]);

  const handleRestart = () => {
    hasStarted.current = false;
    reset();
    setTimeout(() => {
      hasStarted.current = true;
      start();
    }, 100);
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      {/* Phone frame */}
      <div className="rounded-[2.5rem] border border-border/50 bg-background p-2 shadow-2xl">
        {/* Notch / Status bar */}
        <div className="flex items-center justify-between rounded-t-[2rem] bg-muted/30 px-6 py-3">
          <span className="text-xs text-muted-foreground">9:41</span>
          <div className="h-5 w-20 rounded-full bg-background" />
          <div className="flex items-center gap-1">
            <Wifi size={12} className="text-muted-foreground" />
            <div className="h-3 w-5 rounded-sm border border-muted-foreground/50 p-px">
              <div className="h-full w-3/4 rounded-xs bg-green-500" />
            </div>
          </div>
        </div>

        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-border/30 bg-muted/20 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <span className="text-xs font-bold gradient-text">AI</span>
          </div>
          <div>
            <div className="text-sm font-medium">JamiX Ассистент</div>
            <div className="text-xs text-green-500">онлайн</div>
          </div>
          <button
            onClick={handleRestart}
            className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
            title="Перезапустить"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex flex-col gap-3 overflow-y-auto p-4 h-80 sm:h-96"
        >
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                text={msg.text}
                buttons={msg.buttons}
                onButtonClick={handleButtonClick}
              />
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="glass rounded-2xl rounded-bl-md">
                <TypingDots />
              </div>
            </motion.div>
          )}

          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <p className="text-xs text-muted-foreground mb-2">
                Впечатляет? Это работает 24/7
              </p>
              <button
                onClick={handleRestart}
                className="rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs text-primary transition-all hover:bg-primary/15"
              >
                Запустить заново
              </button>
            </motion.div>
          )}
        </div>

        {/* Input bar (decorative) */}
        <div className="flex items-center gap-2 border-t border-border/30 px-4 py-3 rounded-b-[2rem]">
          <div className="flex-1 rounded-full bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
            Сообщение...
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary-foreground"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
