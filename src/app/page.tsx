import { Header } from "@/components/layout/header";
import { HeroSection } from "@/components/sections/hero";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { UseCasesSection } from "@/components/sections/use-cases";
import { ChatDemoSection } from "@/components/sections/chat-demo";
import { PricingSection } from "@/components/sections/pricing";
import { CTASection } from "@/components/sections/cta";
import { Footer } from "@/components/layout/footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <UseCasesSection />
        <ChatDemoSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
