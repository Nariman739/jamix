"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

type Props = {
  plan: string;
  priceKzt: number;
  planName: string;
};

// Конфиг оплаты — обновишь когда дашь реальные реквизиты
const KASPI_PHONE = "+7 775 889 9739";
const KASPI_NAME = "Нариман Д.";
const CONTACT_WHATSAPP = "https://wa.me/77758899739";

export function OrderPlanButton({ plan, priceKzt, planName }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <>
      <Button className="w-full rounded-xl" onClick={() => setOpen(true)}>
        Оплатить — {priceKzt.toLocaleString("ru-RU")} ₸
      </Button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-2xl border border-border max-w-md w-full p-6 space-y-4"
          >
            <div>
              <h3 className="text-xl font-bold">Оплата тарифа {planName}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Переведите по реквизитам ниже — мы активируем подписку в течение часа.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground">Сумма</span>
                  <button
                    onClick={() => copy(String(priceKzt), "amount")}
                    className="text-xs text-brand-blue hover:underline flex items-center gap-1"
                  >
                    {copied === "amount" ? <Check size={12} /> : <Copy size={12} />}
                    {copied === "amount" ? "скопировано" : "копировать"}
                  </button>
                </div>
                <div className="text-2xl font-bold">{priceKzt.toLocaleString("ru-RU")} ₸</div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground">Каспи на номер</span>
                  <button
                    onClick={() => copy(KASPI_PHONE.replace(/\D/g, ""), "phone")}
                    className="text-xs text-brand-blue hover:underline flex items-center gap-1"
                  >
                    {copied === "phone" ? <Check size={12} /> : <Copy size={12} />}
                    {copied === "phone" ? "скопировано" : "копировать"}
                  </button>
                </div>
                <div className="font-medium">{KASPI_PHONE}</div>
                <div className="text-xs text-muted-foreground">{KASPI_NAME}</div>
              </div>

              <div className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                <strong className="text-yellow-400">Важно:</strong> в комментарии к переводу
                напишите ваш email (с которым регистрировались) — так мы быстрее найдём оплату.
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setOpen(false)}
              >
                Закрыть
              </Button>
              <a
                href={`${CONTACT_WHATSAPP}?text=${encodeURIComponent(
                  `Здравствуйте! Оплатил тариф ${planName} (${priceKzt}₸). Активируйте, пожалуйста.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-xl bg-brand-blue text-white px-4 py-2 text-sm font-medium text-center hover:bg-brand-blue/90"
              >
                Я оплатил — WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
