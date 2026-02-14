"use client";

import { useState } from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { ChatWidget } from "@/components/chat/chat-widget";
import { LiveChatWidget } from "@/components/chat/live-chat-widget";
import { scenarios } from "@/components/chat/chat-scenarios";
import { cn } from "@/lib/utils";
import { Bot, MessageSquare } from "lucide-react";

const LIVE_INDUSTRIES = [
  { id: "restaurant", label: "Ресторан" },
  { id: "salon", label: "Салон красоты" },
  { id: "clinic", label: "Клиника" },
  { id: "shop", label: "Магазин" },
];

export function ChatDemoSection() {
  const [mode, setMode] = useState<"live" | "scripted">("live");
  const [activeScenario, setActiveScenario] = useState(scenarios[0]);
  const [liveIndustry, setLiveIndustry] = useState(LIVE_INDUSTRIES[0]);

  return (
    <section id="demo" className="py-24 sm:py-32 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-brand-purple/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Попробуйте <span className="gradient-text">прямо сейчас</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              {mode === "live"
                ? "Напишите что угодно — настоящий AI ответит в реальном времени"
                : "Посмотрите готовые сценарии работы AI-сотрудника"}
            </p>
          </div>
        </FadeIn>

        {/* Mode switcher */}
        <FadeIn delay={0.1}>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-xl bg-muted/50 p-1">
              <button
                onClick={() => setMode("live")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all",
                  mode === "live"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Bot size={16} />
                Живой AI
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
              </button>
              <button
                onClick={() => setMode("scripted")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all",
                  mode === "scripted"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare size={16} />
                Сценарии
              </button>
            </div>
          </div>
        </FadeIn>

        <div className="mt-10 flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center lg:gap-16">
          {/* Tabs */}
          <FadeIn direction="left" delay={0.2}>
            <div className="flex flex-row flex-wrap justify-center gap-2 lg:flex-col lg:w-44">
              {mode === "live"
                ? LIVE_INDUSTRIES.map((ind) => (
                    <button
                      key={ind.id}
                      onClick={() => setLiveIndustry(ind)}
                      className={cn(
                        "rounded-xl px-4 py-2.5 text-sm font-medium transition-all text-left",
                        liveIndustry.id === ind.id
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "glass text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {ind.label}
                    </button>
                  ))
                : scenarios.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveScenario(s)}
                      className={cn(
                        "rounded-xl px-4 py-2.5 text-sm font-medium transition-all text-left",
                        activeScenario.id === s.id
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "glass text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
            </div>
          </FadeIn>

          {/* Widget */}
          <FadeIn direction="right" delay={0.3}>
            {mode === "live" ? (
              <LiveChatWidget
                key={liveIndustry.id}
                industry={liveIndustry.id}
              />
            ) : (
              <ChatWidget
                key={activeScenario.id}
                scenario={activeScenario}
              />
            )}
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
