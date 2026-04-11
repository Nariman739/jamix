"use client";

import { useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { ScrollProgress } from "@/components/layout/scroll-progress";
import { HeroSection } from "@/components/sections/hero";
import { ProblemsSection } from "@/components/sections/problems";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { DemoSection } from "@/components/sections/demo";
import { NichesSection } from "@/components/sections/niches";
import { ResultsSection } from "@/components/sections/results";
import { SocialProofSection } from "@/components/sections/social-proof";
import { FAQSection } from "@/components/sections/faq";
import { CTASection } from "@/components/sections/cta";
import { Footer } from "@/components/layout/footer";
import { ChatWidget } from "@/components/chat/chat-widget";
import { trackLead } from "@/lib/meta-pixel";

export default function HomePage() {
  const chatOpenRef = useRef<(() => void) | null>(null);

  const registerChatHandlers = useCallback(
    (open: () => void, _sendMessage: (msg: string) => void) => {
      chatOpenRef.current = open;
    },
    []
  );

  const handleOpenChat = useCallback(() => {
    chatOpenRef.current?.();
    trackLead();
  }, []);

  return (
    <>
      <ScrollProgress />
      <Header onOpenChat={handleOpenChat} />
      <main>
        <HeroSection onOpenChat={handleOpenChat} />
        <ProblemsSection />
        <HowItWorksSection />
        <DemoSection onOpenChat={handleOpenChat} />
        <NichesSection />
        <ResultsSection />
        <SocialProofSection />
        <FAQSection onOpenChat={handleOpenChat} />
        <CTASection onOpenChat={handleOpenChat} />
      </main>
      <Footer />
      <ChatWidget registerHandlers={registerChatHandlers} />
    </>
  );
}
