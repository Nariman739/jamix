"use client";

import { StaggerContainer, StaggerItem } from "@/components/motion/fade-in";
import { FadeIn } from "@/components/motion/fade-in";
import { INDUSTRIES } from "@/lib/constants";
import {
  Utensils,
  Scissors,
  Stethoscope,
  ShoppingBag,
  Hammer,
  GraduationCap,
  Car,
  Sparkles,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Utensils,
  Scissors,
  Stethoscope,
  ShoppingBag,
  Hammer,
  GraduationCap,
  Car,
  Sparkles,
};

export function UseCasesSection() {
  return (
    <section id="use-cases" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeIn>
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Для любой <span className="gradient-text">ниши</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              AI-сотрудник адаптируется под специфику вашего бизнеса
            </p>
          </div>
        </FadeIn>

        <StaggerContainer
          className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          staggerDelay={0.08}
        >
          {INDUSTRIES.map((industry) => {
            const Icon = iconMap[industry.icon];
            return (
              <StaggerItem key={industry.id}>
                <a
                  href="#demo"
                  className="group block glass rounded-2xl p-5 glow-hover h-full"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {Icon && <Icon size={20} className="text-primary" />}
                  </div>
                  <h3 className="mb-2 font-semibold text-sm">{industry.name}</h3>
                  <ul className="space-y-1">
                    {industry.features.map((f) => (
                      <li
                        key={f}
                        className="text-xs text-muted-foreground flex items-start gap-1.5"
                      >
                        <span className="mt-1 h-1 w-1 rounded-full bg-brand-purple shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </a>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
