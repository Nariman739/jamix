"use client";

import { useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { ScrollProgress } from "@/components/layout/scroll-progress";
import { HeroSection } from "@/components/sections/hero";
import { ServicesSection } from "@/components/sections/services";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { TrustSection } from "@/components/sections/trust";
import { CasesSection } from "@/components/sections/cases";
import { ComparisonSection } from "@/components/sections/comparison";
import { FAQSection } from "@/components/sections/faq";
import { CTASection } from "@/components/sections/cta";
import { Footer } from "@/components/layout/footer";
import { ChatWidget } from "@/components/chat/chat-widget";

export default function HomePage() {
  const chatOpenRef = useRef<(() => void) | null>(null);
  const chatMessageRef = useRef<((msg: string) => void) | null>(null);

  // Register chat widget open handler
  const registerChatHandlers = useCallback(
    (open: () => void, sendMessage: (msg: string) => void) => {
      chatOpenRef.current = open;
      chatMessageRef.current = sendMessage;
    },
    []
  );

  const handleOpenChat = useCallback(() => {
    chatOpenRef.current?.();
  }, []);

  const handleOpenChatWithMessage = useCallback((message: string) => {
    chatOpenRef.current?.();
    // Small delay to let chat open before sending
    setTimeout(() => chatMessageRef.current?.(message), 600);
  }, []);

  return (
    <>
      <ScrollProgress />
      <Header onOpenChat={handleOpenChat} />
      <main>
        <HeroSection onOpenChat={handleOpenChat} />
        <ServicesSection onOpenChat={handleOpenChatWithMessage} />
        <HowItWorksSection />
        <TrustSection />
        <CasesSection />
        <ComparisonSection />
        <FAQSection onOpenChat={handleOpenChat} />
        <CTASection onOpenChat={handleOpenChat} />
      </main>
      <Footer />
      <ChatWidget registerHandlers={registerChatHandlers} />
    </>
  );
}
