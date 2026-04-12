"use client";

import { useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { ScrollProgress } from "@/components/layout/scroll-progress";
import { HeroSection } from "@/components/sections/hero";
import { ServicesSection } from "@/components/sections/services";
import { ProblemsSection } from "@/components/sections/problems";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { DemoSection } from "@/components/sections/demo";
import { SocialProofSection } from "@/components/sections/social-proof";
import { ResultsSection } from "@/components/sections/results";
import { FAQSection } from "@/components/sections/faq";
import { CTASection } from "@/components/sections/cta";
import { Footer } from "@/components/layout/footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { trackLead } from "@/lib/meta-pixel";

export default function HomePage() {
  const chatOpenRef = useRef<(() => void) | null>(null);
  const chatMessageRef = useRef<((msg: string) => void) | null>(null);

  const registerChatHandlers = useCallback(
    (open: () => void, sendMessage: (msg: string) => void) => {
      chatOpenRef.current = open;
      chatMessageRef.current = sendMessage;
    },
    []
  );

  const handleOpenChat = useCallback(() => {
    chatOpenRef.current?.();
    trackLead();
  }, []);

  const handleOpenChatWithMessage = useCallback((message: string) => {
    chatOpenRef.current?.();
    trackLead();
    setTimeout(() => chatMessageRef.current?.(message), 600);
  }, []);

  return (
    <>
      <ScrollProgress />
      <Header onOpenChat={handleOpenChat} />
      <main>
        <HeroSection onOpenChat={handleOpenChat} />
        <ServicesSection onOpenChat={handleOpenChatWithMessage} />
        <ProblemsSection />
        <HowItWorksSection />
        <DemoSection onOpenChat={handleOpenChat} />
        <SocialProofSection />
        <ResultsSection />
        <FAQSection onOpenChat={handleOpenChat} />
        <CTASection onOpenChat={handleOpenChat} />
      </main>
      <Footer />
      <ChatWidget registerHandlers={registerChatHandlers} />
    </>
  );
}
