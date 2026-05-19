import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/layout/footer";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/30 backdrop-blur-md sticky top-0 z-30 bg-background/80">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold gradient-text">
            JamiX
          </Link>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            На главную
          </Link>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 sm:px-6 py-10">
        {children}
      </main>
      <Footer />
    </div>
  );
}
