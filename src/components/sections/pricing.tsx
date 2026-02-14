"use client";

import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRICING, SITE } from "@/lib/constants";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Тарифы <span className="gradient-text">и цены</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Выберите подходящий тариф. Точная стоимость — после бесплатной
              консультации.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer
          className="mt-16 grid gap-6 md:grid-cols-3"
          staggerDelay={0.12}
        >
          {PRICING.map((plan) => (
            <StaggerItem key={plan.name}>
              <div
                className={cn(
                  "relative flex flex-col rounded-2xl p-6 sm:p-8 glow-hover h-full",
                  plan.popular
                    ? "gradient-border glass-strong"
                    : "glass"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs">
                    Популярный
                  </Badge>
                )}

                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-6">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="ml-1 text-lg text-muted-foreground">
                    {plan.currency}
                  </span>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check
                        size={16}
                        className="mt-0.5 shrink-0 text-green-500"
                      />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={cn(
                    "mt-8 w-full rounded-full",
                    plan.popular
                      ? ""
                      : "variant-outline bg-transparent border border-border hover:bg-muted"
                  )}
                  variant={plan.popular ? "default" : "outline"}
                >
                  <a
                    href={SITE.telegramBot}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {plan.popular ? "Выбрать" : "Узнать больше"}
                  </a>
                </Button>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeIn delay={0.4}>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            + Подписка на обслуживание: от 30 000 ₸/мес (поддержка, доработки,
            обновления базы знаний)
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
