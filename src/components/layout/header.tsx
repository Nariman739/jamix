"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/constants";
import { Menu, X, MessageCircle, LogIn } from "lucide-react";

export function Header({ onOpenChat }: { onOpenChat?: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? "glass-strong py-3" : "py-5"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 gap-3">
        <a href="#" className="text-xl font-bold tracking-tight">
          <span className="gradient-text">JamiX</span>
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/products/whatsapp"
            className="text-sm font-medium text-foreground transition-colors hover:text-brand-blue inline-flex items-center gap-1.5"
          >
            <MessageCircle size={14} className="text-brand-blue" />
            WhatsApp-бот
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/cabinet/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-full transition-colors"
          >
            <LogIn size={14} />
            Войти
          </Link>
          <Button
            size="sm"
            className="rounded-full px-6"
            onClick={onOpenChat}
          >
            Подобрать решение
          </Button>
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Меню"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="glass-strong mt-2 mx-4 rounded-xl p-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground py-2"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/products/whatsapp"
              onClick={() => setMobileOpen(false)}
              className="text-sm font-medium text-foreground py-2 inline-flex items-center gap-2"
            >
              <MessageCircle size={14} className="text-brand-blue" />
              WhatsApp-бот
            </Link>
            <Link
              href="/cabinet/login"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-muted-foreground hover:text-foreground py-2 inline-flex items-center gap-2"
            >
              <LogIn size={14} />
              Войти в кабинет
            </Link>
            <Button
              size="sm"
              className="rounded-full mt-2"
              onClick={() => {
                setMobileOpen(false);
                onOpenChat?.();
              }}
            >
              Подобрать решение
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
