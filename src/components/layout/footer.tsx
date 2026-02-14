import { SITE, NAV_LINKS } from "@/lib/constants";
import { Send, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <span className="gradient-text text-xl font-bold">JamiX</span>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              AI-автоматизация бизнеса. Создаём нейро-сотрудников которые
              продают, консультируют и записывают клиентов 24/7.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">Навигация</h4>
            <nav className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Contacts */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">Контакты</h4>
            <div className="flex flex-col gap-2">
              <a
                href={SITE.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Send size={14} />
                Telegram
              </a>
              <a
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <MessageCircle size={14} />
                Instagram
              </a>
            </div>
          </div>

          {/* CTA mini */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">Попробуйте</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Бесплатная демо-версия AI-сотрудника в Telegram
            </p>
            <a
              href={SITE.telegramBot}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Send size={14} />
              Запустить демо
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} JamiX. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
