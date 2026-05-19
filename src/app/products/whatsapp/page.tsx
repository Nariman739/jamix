import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  Smartphone,
  MessageSquare,
  Bell,
  BookOpen,
  Code2,
  Sparkles,
  ArrowRight,
  Clock,
  Shield,
} from "lucide-react";
import { DemoChat } from "@/components/products/demo-chat";

export const metadata = {
  title: "Jamiwa — AI-бот в WhatsApp для бизнеса",
  description:
    "Подключите свой WhatsApp за 30 секунд по QR. Настройте AI-роль, базу знаний и получайте уведомления о горячих лидах. Для малого бизнеса в Казахстане.",
};

export default function ProductLanding() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold gradient-text">
            JamiX
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/cabinet/login" className="text-muted-foreground hover:text-foreground transition">
              Войти
            </Link>
            <Link
              href="/cabinet/signup"
              className="rounded-xl bg-brand-blue text-white px-4 py-2 hover:bg-brand-blue/90 transition"
            >
              Попробовать
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-16 md:py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue mb-6">
            <Sparkles size={12} /> AI-ассистент в WhatsApp
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="gradient-text">AI-бот</span> в вашем WhatsApp —
            <br /> отвечает 24/7, не упускает клиентов
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Подключите свой номер WhatsApp по QR-коду, задайте AI роль ваших менеджеров — и бот будет
            отвечать клиентам, собирать заявки и предупреждать вас о готовых к покупке.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/cabinet/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue text-white px-6 py-3 hover:bg-brand-blue/90 transition text-base font-medium"
            >
              Подключить за 30 секунд <ArrowRight size={16} />
            </Link>
            <span className="text-xs text-muted-foreground">3 дня бесплатно · без карты</span>
          </div>

          <div className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-full px-4 py-2">
            <Bot size={14} className="text-brand-blue" />
            <span>
              Хочешь сначала попробовать AI вживую?{" "}
              <span className="text-brand-blue font-medium">Кнопка чата справа внизу 👇</span>
            </span>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Почему это работает лучше обычных чат-ботов
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <FeatureCard
              icon={Smartphone}
              title="Ваш собственный номер"
              text="Клиенты пишут вам в обычный WhatsApp как раньше. Не нужно мигрировать на платный WhatsApp Business API."
            />
            <FeatureCard
              icon={Bot}
              title="AI с вашей ролью"
              text="Не шаблонные ответы, а живой диалог: задайте промпт, цели, тон общения. Бот ведёт клиента до сделки."
            />
            <FeatureCard
              icon={Bell}
              title="Уведомления о горячих лидах"
              text="AI распознаёт когда клиент готов купить — и сразу пишет вам в Telegram, чтобы вы не упустили."
            />
            <FeatureCard
              icon={BookOpen}
              title="База знаний компании"
              text="Цены, услуги, режим работы, FAQ — AI отвечает на основе вашей информации, без выдумок."
            />
            <FeatureCard
              icon={Clock}
              title="Подхватывает 24/7"
              text="Клиент пишет в 23:00? Бот отвечает. Клиент пишет в выходной? Бот отвечает. Вы не теряете заявки."
            />
            <FeatureCard
              icon={Code2}
              title="API + Webhooks"
              text="Подключите к n8n, CRM, своему сайту. Полный REST API и webhooks на входящие сообщения."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            3 шага до запуска
          </h2>
          <div className="space-y-6">
            <Step
              num={1}
              title="Подключите WhatsApp"
              text="Зайдите в кабинет, нажмите «Подключить» — сканируйте QR с телефона (как WhatsApp Web). Готово, ваш номер привязан."
            />
            <Step
              num={2}
              title="Опишите бота словами"
              text="Кто он, что предлагает, как должен общаться. Можно использовать готовые шаблоны (продажи, запись, поддержка). Добавьте FAQ и цены — AI будет их знать."
            />
            <Step
              num={3}
              title="Включите и тестируйте"
              text="Сначала в Тест-чате — без реальной отправки клиентам. Когда довольны — включите AI на номере. Бот начнёт отвечать всем входящим автоматически."
            />
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Подходит для любого бизнеса
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <UseCase
              title="Магазины и e-commerce"
              text='"Здравствуйте, есть ли в наличии iPhone 16? Сколько стоит, есть ли рассрочка?" — бот ответит и направит к менеджеру при готовности к покупке.'
            />
            <UseCase
              title="Салоны красоты, медцентры"
              text='"Запишите меня на завтра в 15:00 на маникюр" — бот уточняет услугу, мастера, цену и передаёт администратору на запись.'
            />
            <UseCase
              title="Услуги и ремонт"
              text='"Сколько стоит натяжной потолок на 18 кв.м?" — бот сориентирует по ценам, спросит про адрес и предложит замер.'
            />
            <UseCase
              title="Детские центры и развлечения"
              text='"Хочу провести день рождения для 8 детей в субботу" — бот соберёт детали, цену и передаст администратору.'
            />
            <UseCase
              title="Образование и курсы"
              text='"Какие у вас курсы английского для детей?" — бот расскажет о программе, ценах, расписании и запишет на пробное."'
            />
            <UseCase
              title="Доставка и общепит"
              text='"Можно ли заказать пиццу за город?" — бот ответит про зоны, минимальный заказ, оплату и время доставки.'
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 py-16 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">
            Простой тариф — без сюрпризов
          </h2>
          <p className="text-center text-muted-foreground mb-10">
            AI-сообщения, переписки, кабинет, поддержка — всё включено
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <PriceCard
              name="STARTER"
              price="4 990₸"
              period="за номер / месяц"
              features={[
                "1 номер WhatsApp",
                "200 AI-сообщений / день",
                "База знаний",
                "Эскалация в Telegram",
                "Кабинет и API",
              ]}
              cta="Начать с триала"
              ctaHref="/cabinet/signup"
            />
            <PriceCard
              name="PRO"
              price="9 990₸"
              period="за номер / месяц"
              features={[
                "1 номер WhatsApp",
                "AI без лимита (Fair Use 2000/день)",
                "Claude Sonnet (умнее)",
                "База знаний 10 000 символов",
                "Telegram-уведомления",
                "Webhooks для интеграций",
              ]}
              highlight
              cta="Начать с триала"
              ctaHref="/cabinet/signup"
            />
            <PriceCard
              name="BUSINESS"
              price="24 990₸"
              period="за 3 номера / месяц"
              features={[
                "3 номера WhatsApp",
                "5000 AI-сообщений на номер",
                "Приоритетная поддержка",
                "Кастомные интеграции",
                "AmoCRM, Bitrix24, n8n",
              ]}
              cta="Начать с триала"
              ctaHref="/cabinet/signup"
            />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            <strong className="text-foreground">3 дня бесплатно</strong> на любом тарифе. Без карты.
            Подключи свой номер, протестируй — потом решишь.
          </p>
        </div>
      </section>

      {/* Safety / FAQ */}
      <section className="px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Частые вопросы</h2>
          <div className="space-y-4">
            <FAQ
              q="Заблокирует ли WhatsApp мой номер?"
              a="Если использовать сервис по назначению (отвечать клиентам, не делать массовых рассылок незнакомым) — риска нет. Wazzup и GreenAPI работают по тому же принципу годами. Мы ограничиваем скорость отправки до 1 сообщения в секунду на номер."
            />
            <FAQ
              q="Могу ли я в любой момент взять управление и ответить вручную?"
              a="Да. В кабинете во вкладке «Переписки» можно поставить бота на паузу для конкретного чата одной кнопкой — и продолжить общение лично. Также бот сам передаёт оператору когда клиент просит."
            />
            <FAQ
              q="Откуда AI знает информацию о моей компании?"
              a="Вы заполняете «Базу знаний» в кабинете — цены, услуги, режим работы, FAQ. AI использует эту информацию в ответах. Можно обновлять в любой момент."
            />
            <FAQ
              q="Что если AI не сможет ответить?"
              a="Включите «Передачу оператору» — когда бот не уверен или клиент просит человека, он остановится в чате и пришлёт вам уведомление в Telegram. Вы продолжите вручную."
            />
            <FAQ
              q="Можно ли подключить к моей CRM?"
              a="Да, через REST API и webhooks. n8n / Make / Zapier — работают через стандартный Bearer-токен. Для AmoCRM и Bitrix24 готовим прямой коннектор в BUSINESS-тарифе."
            />
            <FAQ
              q="Где хранятся данные?"
              a="В Казахстане-релевантной инфраструктуре. Сессии WhatsApp хранятся зашифрованными (AES-256-GCM). Доступ к данным только у вашего tenant — никто другой не видит ваши чаты."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Подключите AI к WhatsApp <span className="gradient-text">за 30 секунд</span>
          </h2>
          <p className="text-muted-foreground mb-8">
            7 дней бесплатно, без привязки карты. Отмена в один клик.
          </p>
          <Link
            href="/cabinet/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue text-white px-8 py-4 hover:bg-brand-blue/90 transition text-base font-medium"
          >
            Начать бесплатно <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/40 px-4 py-8 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <Shield size={12} />
          Jamiwa — продукт JamiX · Astana, KZ · 2026
        </div>
      </footer>

      <DemoChat />
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Bot;
  title: string;
  text: string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <Icon className="text-brand-blue mb-3" size={22} />
      <h3 className="font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function Step({ num, title, text }: { num: number; title: string; text: string }) {
  return (
    <div className="glass rounded-2xl p-5 flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-full bg-brand-blue/10 text-brand-blue font-bold flex items-center justify-center">
        {num}
      </div>
      <div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function UseCase({ title, text }: { title: string; text: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="inline-flex items-center gap-2 mb-2">
        <MessageSquare size={14} className="text-brand-blue" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground italic leading-relaxed">{text}</p>
    </div>
  );
}

function PriceCard({
  name,
  price,
  period,
  features,
  cta,
  ctaHref,
  highlight,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 ${
        highlight
          ? "bg-gradient-to-br from-brand-blue/20 to-brand-blue/5 border border-brand-blue/40"
          : "glass"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {name}
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-3xl font-bold">{price}</span>
      </div>
      <div className="text-xs text-muted-foreground mb-5">{period}</div>
      <ul className="space-y-2.5 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <CheckCircle2 size={14} className="text-brand-blue shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={`block text-center rounded-xl py-2.5 text-sm font-medium transition ${
          highlight
            ? "bg-brand-blue text-white hover:bg-brand-blue/90"
            : "bg-muted/50 hover:bg-muted"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="glass rounded-2xl p-5 group">
      <summary className="font-medium cursor-pointer flex items-start justify-between gap-3">
        {q}
        <span className="text-muted-foreground text-xl group-open:rotate-45 transition shrink-0">
          +
        </span>
      </summary>
      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{a}</p>
    </details>
  );
}
