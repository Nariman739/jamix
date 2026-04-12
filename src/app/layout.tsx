import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import { PIXEL_ID } from "@/lib/meta-pixel";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "JamiX — AI-решения для вашего бизнеса",
  description:
    "AI-боты, мини-CRM без подписок, ассистенты и автоматизация — под ключ. Расскажите о задаче, подберём решение.",
  keywords: [
    "AI решения для бизнеса",
    "AI бот",
    "мини CRM без подписок",
    "AI ассистент",
    "WhatsApp бот",
    "Telegram бот",
    "автоматизация бизнеса",
    "JamiX",
    "AI Казахстан",
  ],
  openGraph: {
    title: "JamiX — AI-решения для бизнеса в Казахстане",
    description:
      "Боты-продавцы, мини-CRM, AI-ассистенты, автоматизация — под ключ. Бесплатный разбор.",
    type: "website",
    locale: "ru_RU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
        {PIXEL_ID && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
