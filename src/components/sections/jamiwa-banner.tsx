import Link from "next/link";
import { ArrowRight, Sparkles, MessageCircle, Shield, Zap } from "lucide-react";

export function JamiwaBanner() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-brand-blue/30 bg-gradient-to-br from-brand-blue/15 via-brand-blue/5 to-transparent p-6 sm:p-10">
          {/* Glow decoration */}
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-brand-blue/20 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-blue/15 px-3 py-1 text-xs text-brand-blue mb-4">
                <Sparkles size={12} />
                Готовый продукт
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                <span className="gradient-text">Jamiwa</span> — AI-бот в WhatsApp за 30 секунд
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-5">
                Сам отвечает клиентам в WhatsApp 24/7. Подключение по QR-коду как WhatsApp Web. Расскажи AI-мастеру про свой бизнес — он соберёт бота под тебя за пару минут.
              </p>

              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
                <Feature icon={<Zap size={14} />} text="QR за 30 сек" />
                <Feature icon={<MessageCircle size={14} />} text="AI отвечает 24/7" />
                <Feature icon={<Shield size={14} />} text="Защита от бана" />
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <Link
                  href="/cabinet/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-blue px-6 py-3 text-sm font-medium text-white hover:bg-brand-blue/90 transition shadow-lg shadow-brand-blue/30"
                >
                  Попробовать бесплатно 3 дня
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/products/whatsapp"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm font-medium hover:bg-muted/30 transition"
                >
                  Подробнее о продукте
                </Link>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Без карты · от 4990 ₸/мес после триала
              </p>
            </div>

            {/* Mini demo */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="rounded-2xl bg-background/70 backdrop-blur-sm border border-border/40 p-4 space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-border/30 mb-1">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <MessageCircle size={12} className="text-emerald-400" />
                  </div>
                  <div className="text-xs">
                    <div className="font-medium">WhatsApp клиента</div>
                    <div className="text-[10px] text-muted-foreground">отвечает AI</div>
                  </div>
                </div>
                <Bubble side="left" text="Сколько стоит натяжной потолок 18м²?" />
                <Bubble
                  side="right"
                  text="Матовый 18м² — от 54 000 ₸ с установкой. Замер бесплатный. Записать?"
                />
                <Bubble side="left" text="Да, на субботу" />
                <Bubble side="right" text="Отлично! Суббота 10-12, имя и адрес?" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-brand-blue">{icon}</span>
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}

function Bubble({ side, text }: { side: "left" | "right"; text: string }) {
  return (
    <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs ${
          side === "right" ? "bg-brand-blue text-white" : "bg-muted/60"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
