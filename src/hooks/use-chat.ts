"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { type ChatScenario, type ChatMessage } from "@/components/chat/chat-scenarios";

export type VisibleMessage = ChatMessage & { id: number };

export function useChat(scenario: ChatScenario) {
  const [messages, setMessages] = useState<VisibleMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [waitingForButton, setWaitingForButton] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessages([]);
    setIsTyping(false);
    setCurrentStep(0);
    setWaitingForButton(false);
    idRef.current = 0;
  }, []);

  const showMessage = useCallback(
    (step: number) => {
      const msg = scenario.messages[step];
      if (!msg) return;

      if (msg.role === "bot") {
        setIsTyping(true);
        timeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          const id = ++idRef.current;
          setMessages((prev) => [...prev, { ...msg, id }]);
          setCurrentStep(step + 1);

          if (msg.buttons && msg.buttons.length > 0) {
            setWaitingForButton(true);
          } else if (step + 1 < scenario.messages.length) {
            showMessage(step + 1);
          }
        }, msg.delay);
      } else {
        timeoutRef.current = setTimeout(() => {
          const id = ++idRef.current;
          setMessages((prev) => [...prev, { ...msg, id }]);
          setCurrentStep(step + 1);

          if (step + 1 < scenario.messages.length) {
            showMessage(step + 1);
          }
        }, msg.delay);
      }
    },
    [scenario.messages]
  );

  const handleButtonClick = useCallback(
    (nextStep: number) => {
      setWaitingForButton(false);
      // Remove buttons from the last bot message
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, buttons: undefined } : m
        )
      );

      const nextMsg = scenario.messages[nextStep];
      if (nextMsg) {
        showMessage(nextStep);
      }
    },
    [scenario.messages, showMessage]
  );

  const start = useCallback(() => {
    reset();
    // Small delay before first message
    timeoutRef.current = setTimeout(() => {
      showMessage(0);
    }, 300);
  }, [reset, showMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    messages,
    isTyping,
    waitingForButton,
    currentStep,
    isComplete: currentStep >= scenario.messages.length && !isTyping,
    handleButtonClick,
    start,
    reset,
  };
}
