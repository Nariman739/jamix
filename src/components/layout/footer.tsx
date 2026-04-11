import { SITE } from "@/lib/constants";
import { Send, MessageCircle, Instagram, Phone, Clock, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/30 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <span className="text-lg font-bold gradient-text">JamiX</span>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              AI-продавцы для бизнеса в Казахстане.
              Отвечают клиентам 24/7, закрывают заявки, увеличивают продажи.
            </p>
          </div>

          {/* Contacts */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Контакты</h4>
            <div className="space-y-2">
              <a href="tel:+77758899739" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Phone size={14} />
                +7 775 889 9739
              </a>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock size={14} />
                Пн-Сб, 9:00-19:00
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin size={14} />
                Астана, Казахстан
              </div>
            </div>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Мы в сети</h4>
            <div className="flex items-center gap-3">
              <a
                href={SITE.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors glow-hover"
                title="Telegram"
              >
                <Send size={16} />
              </a>
              <a
                href={SITE.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors glow-hover"
                title="WhatsApp"
              >
                <MessageCircle size={16} />
              </a>
              <a
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 w-10 rounded-xl glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors glow-hover"
                title="Instagram"
              >
                <Instagram size={16} />
              </a>
            </div>
            <a
              href={`mailto:${SITE.email}`}
              className="block mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {SITE.email}
            </a>
          </div>
        </div>

        <div className="border-t border-border/20 pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} JamiX. Астана, Казахстан. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
