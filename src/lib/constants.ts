export const SITE = {
  name: "JamiX",
  tagline: "AI-сотрудник для вашего бизнеса",
  description:
    "Отвечает клиентам 24/7 в Telegram и WhatsApp. Считает стоимость, записывает на приём, ведёт CRM.",
  telegramBot: "https://t.me/JamiXXXBot",
  telegram: "https://t.me/nariman_jaminov",
  whatsapp:
    "https://wa.me/77758899739?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82!%20%D0%A5%D0%BE%D1%87%D1%83%20%D1%83%D0%B7%D0%BD%D0%B0%D1%82%D1%8C%20%D0%BF%D1%80%D0%BE%20AI-%D1%81%D0%BE%D1%82%D1%80%D1%83%D0%B4%D0%BD%D0%B8%D0%BA%D0%B0",
  instagram: "https://instagram.com/jamix.ai",
  email: "info@jamix.ai",
} as const;

export const NAV_LINKS = [
  { label: "Как работает", href: "#how-it-works" },
  { label: "Ниши", href: "#use-cases" },
  { label: "Демо", href: "#demo" },
  { label: "Цены", href: "#pricing" },
] as const;

export const PRICING = [
  {
    name: "Старт",
    price: "от 150 000",
    currency: "₸",
    description: "Для малого бизнеса",
    features: [
      "1 мессенджер (Telegram или WhatsApp)",
      "FAQ-бот с базой знаний",
      "До 500 сообщений/мес",
      "Настройка за 3 дня",
      "Поддержка 2 недели",
    ],
    popular: false,
  },
  {
    name: "Бизнес",
    price: "от 350 000",
    currency: "₸",
    description: "Самый популярный",
    features: [
      "2 мессенджера",
      "AI-продажник с расчётом цен",
      "CRM + запись на приём",
      "До 2 000 сообщений/мес",
      "Настройка за 5 дней",
      "Поддержка 1 месяц",
    ],
    popular: true,
  },
  {
    name: "Премиум",
    price: "от 700 000",
    currency: "₸",
    description: "Полная автоматизация",
    features: [
      "Все мессенджеры",
      "AI-продажник + follow-up",
      "CRM + аналитика + отчёты",
      "Безлимит сообщений",
      "Google Calendar интеграция",
      "Поддержка 3 месяца",
    ],
    popular: false,
  },
] as const;

export const INDUSTRIES = [
  {
    id: "restaurant",
    icon: "Utensils",
    name: "Рестораны и кафе",
    features: ["Бронирование столов", "Меню и акции", "Заказ доставки"],
  },
  {
    id: "salon",
    icon: "Scissors",
    name: "Салоны красоты",
    features: ["Запись на процедуры", "Прайс-лист", "Напоминания"],
  },
  {
    id: "clinic",
    icon: "Stethoscope",
    name: "Клиники",
    features: ["Запись к врачу", "FAQ по анализам", "Направления"],
  },
  {
    id: "shop",
    icon: "ShoppingBag",
    name: "Интернет-магазины",
    features: ["Консультации", "Статус заказа", "Подбор товаров"],
  },
  {
    id: "repair",
    icon: "Hammer",
    name: "Ремонт и строительство",
    features: ["Расчёт стоимости", "Запись на замер", "Портфолио"],
  },
  {
    id: "education",
    icon: "GraduationCap",
    name: "Образование",
    features: ["Расписание", "Оплата", "Ответы на вопросы"],
  },
  {
    id: "auto",
    icon: "Car",
    name: "Автосервис",
    features: ["Запись на ТО", "Диагностика", "Статус ремонта"],
  },
  {
    id: "other",
    icon: "Sparkles",
    name: "Другое",
    features: ["Настроим под любой бизнес", "Индивидуальный подход", "Любая ниша"],
  },
] as const;
