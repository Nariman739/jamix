"use client";

import { useState, useCallback, useRef } from "react";

export type LiveMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export function useLiveChat(industry: string) {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const idRef = useRef(0);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: LiveMessage = {
        id: ++idRef.current,
        role: "user",
        content: text.trim(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const apiMessages = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: text.trim() },
        ];

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, industry }),
        });

        const data = await res.json();

        const botMsg: LiveMessage = {
          id: ++idRef.current,
          role: "assistant",
          content: data.reply,
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch {
        const errMsg: LiveMessage = {
          id: ++idRef.current,
          role: "assistant",
          content: "Не удалось подключиться. Попробуйте ещё раз.",
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, industry, isLoading]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
    idRef.current = 0;
  }, []);

  return { messages, isLoading, sendMessage, reset };
}
