import type { Metadata } from "next";
import { Geist } from "next/font/google";
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
      <body className={`${geistSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
