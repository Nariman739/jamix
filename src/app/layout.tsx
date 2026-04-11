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
  title: "JamiX — AI-продавец для вашего бизнеса",
  description:
    "AI-продавец в WhatsApp и Telegram, который отвечает клиентам за 3 секунды, квалифицирует заявки и закрывает сделки 24/7. Настройка за 3-7 дней.",
  keywords: [
    "AI продавец",
    "AI бот для продаж",
    "WhatsApp бот",
    "Telegram бот",
    "автоматизация продаж",
    "бот для бизнеса",
    "нейросотрудник",
    "JamiX",
    "AI Казахстан",
  ],
  openGraph: {
    title: "JamiX — AI-продавец, который закрывает заявки за вас",
    description:
      "Бот отвечает клиентам за 3 секунды, 24/7. Консультирует, считает стоимость, записывает. Попробуйте бесплатно.",
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
      <head>
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
      </head>
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
