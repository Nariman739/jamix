import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "JamiX — AI-решения для вашего бизнеса",
  description:
    "AI-агентство в Казахстане. Telegram-боты, WhatsApp, CRM-автоматизация, умные ассистенты — под ключ. Расскажите о задаче — подберём решение за 2 минуты.",
  keywords: [
    "AI автоматизация",
    "AI бот",
    "чат-бот для бизнеса",
    "Telegram бот",
    "WhatsApp бот",
    "автоматизация продаж",
    "нейросотрудник",
    "JamiX",
  ],
  openGraph: {
    title: "JamiX — AI-сотрудник для вашего бизнеса",
    description:
      "Нейро-сотрудник который продаёт, консультирует и записывает клиентов 24/7",
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
