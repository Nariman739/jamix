"use client";

import Link from "next/link";
import { Bot, Smartphone, MessageSquare, FlaskConical, Shield } from "lucide-react";

type Tab = "connect" | "bot" | "test" | "chats" | "safety";

const tabs: { id: Tab; label: string; icon: typeof Bot; href: (id: string) => string }[] = [
  { id: "connect", label: "Телефон", icon: Smartphone, href: (id) => `/cabinet/wa/instances/${id}` },
  { id: "bot", label: "Поведение AI", icon: Bot, href: (id) => `/cabinet/wa/instances/${id}/bot` },
  { id: "test", label: "Попробовать", icon: FlaskConical, href: (id) => `/cabinet/wa/instances/${id}/test` },
  { id: "chats", label: "Переписки", icon: MessageSquare, href: (id) => `/cabinet/wa/instances/${id}/chats` },
  { id: "safety", label: "Защита", icon: Shield, href: (id) => `/cabinet/wa/instances/${id}/safety` },
];

export function InstanceTabs({ id, active }: { id: string; active: Tab }) {
  return (
    <nav className="flex gap-1 border-b border-border/40 overflow-x-auto -mx-4 px-4">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            href={tab.href(id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 -mb-px transition whitespace-nowrap ${
              isActive
                ? "border-brand-blue text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={14} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
