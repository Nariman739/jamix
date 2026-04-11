"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface UseLiveChatReturn {
  messages: ChatMessage[];
  sessionId: string | null;
  isStreaming: boolean;
  sendMessage: (text: string) => Promise<void>;
  reset: () => void;
}

// Strip lead_data blocks that may leak through streaming
function cleanLeadData(content: string): string {
  // Strip ```lead_data ... ``` blocks
  let cleaned = content.replace(/```\s*lead_data\s*\n[\s\S]*?\n\s*```/g, "").trim();
  // Strip raw JSON blocks that look like lead data (fallback)
  cleaned = cleaned.replace(/\{\s*"businessType"[\s\S]*?"recommendedServices"[\s\S]*?\}/g, "").trim();
  // Strip partial lead_data blocks (incomplete streaming)
  cleaned = cleaned.replace(/```\s*lead_data[\s\S]*$/g, "").trim();
  // Strip standalone JSON that starts with "businessType"
  cleaned = cleaned.replace(/"businessType"\s*:[\s\S]*$/g, "").trim();
  return cleaned;
}

function getUtmParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  return utm;
}

function getVisitorId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("jamix_visitor_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("jamix_visitor_id", id);
  }
  return id;
}

export function useLiveChat(): UseLiveChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Clear any old cached sessions on mount (fresh start each visit)
  useEffect(() => {
    localStorage.removeItem("jamix_session");
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isStreaming || !text.trim()) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        abortRef.current = new AbortController();

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            visitorId: getVisitorId(),
            sessionId,
            ...getUtmParams(),
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: err.error || "Ошибка. Попробуйте снова." }
                : m
            )
          );
          setIsStreaming(false);
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              switch (event.type) {
                case "session":
                  setSessionId(event.sessionId);
                  break;

                case "text":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + event.content }
                        : m
                    )
                  );
                  break;

                case "replace":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: cleanLeadData(event.content) }
                        : m
                    )
                  );
                  break;

                case "error":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: event.message }
                        : m
                    )
                  );
                  break;

                case "done":
                  // Final cleanup of any leaked lead_data
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: cleanLeadData(m.content) }
                        : m
                    )
                  );
                  break;
              }
            } catch {
              // skip invalid JSON
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Ошибка соединения. Попробуйте снова." }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, sessionId]
  );

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setSessionId(null);
    setIsStreaming(false);
    localStorage.removeItem("jamix_session");
  }, []);

  return { messages, sessionId, isStreaming, sendMessage, reset };
}
