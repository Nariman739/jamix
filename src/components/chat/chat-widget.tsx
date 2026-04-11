"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, RotateCcw } from "lucide-react";
import { ChatContainer } from "./chat-container";
import { useLiveChat } from "@/hooks/use-live-chat";

interface ChatWidgetProps {
  registerHandlers?: (open: () => void, sendMessage: (msg: string) => void) => void;
}

export function ChatWidget({ registerHandlers }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { messages, isStreaming, sendMessage, reset } = useLiveChat();

  // Register handlers for external control
  useEffect(() => {
    if (registerHandlers) {
      registerHandlers(
        () => {
          setIsOpen(true);
          setHasInteracted(true);
          setShowPreview(false);
        },
        (msg: string) => {
          sendMessage(msg);
        }
      );
    }
  }, [registerHandlers, sendMessage]);

  // Show preview bubble after 10 seconds
  useEffect(() => {
    if (hasInteracted) return;
    const timer = setTimeout(() => {
      setShowPreview(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [hasInteracted]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setHasInteracted(true);
    setShowPreview(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <>
      {/* Preview bubble */}
      <AnimatePresence>
        {showPreview && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-50 max-w-[280px] cursor-pointer"
            onClick={handleOpen}
          >
            <div className="glass-strong rounded-2xl rounded-br-sm p-4 shadow-2xl">
              <p className="text-sm text-foreground/90">
                Привет! Я — AI-продавец. Расскажите про ваш бизнес — покажу, как я могу работать для вас
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPreview(false);
                setHasInteracted(true);
              }}
              className="absolute -top-2 -right-2 rounded-full bg-muted p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 w-[400px] max-h-[600px] rounded-2xl overflow-hidden shadow-2xl border border-border/50 max-md:bottom-0 max-md:right-0 max-md:left-0 max-md:top-0 max-md:w-full max-md:max-h-full max-md:rounded-none"
          >
            {/* Header */}
            <div className="glass-strong flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">JAMX AI-продавец</p>
                  <p className="text-xs text-muted-foreground">
                    {isStreaming ? "печатает..." : "онлайн"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={handleReset}
                    className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    title="Новый разговор"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat body */}
            <ChatContainer
              messages={messages}
              isStreaming={isStreaming}
              onSendMessage={sendMessage}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={isOpen ? handleClose : handleOpen}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple shadow-lg shadow-brand-purple/25 flex items-center justify-center text-white hover:shadow-xl hover:shadow-brand-purple/30 transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={!hasInteracted && !isOpen ? { scale: [1, 1.1, 1] } : {}}
        transition={
          !hasInteracted && !isOpen
            ? { repeat: Infinity, duration: 2, ease: "easeInOut" }
            : {}
        }
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageSquare className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
