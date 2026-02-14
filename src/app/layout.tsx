import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "JamiX — AI-сотрудник для вашего бизнеса",
  description:
    "Автоматизация бизнеса с помощью AI. Отвечает клиентам 24/7 в Telegram и WhatsApp, считает стоимость, записывает на приём, ведёт CRM. Запуск за 3 дня.",
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
