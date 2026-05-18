"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Bot, Save, Sparkles, BookOpen, Bell, UserCheck } from "lucide-react";

const TEMPLATES = [
  {
    name: "Администратор детского центра",
    prompt:
      "Ты — администратор детского развлекательного центра. Твоя цель — записать ребёнка на праздник или абонемент. Уточни: имя ребёнка, возраст, дату и количество гостей. Будь вежливой, отвечай тепло и кратко. Если спросят про цены — скажи что менеджер свяжется и уточнит.",
  },
  {
    name: "Мастер натяжных потолков",
    prompt:
      "Ты — менеджер компании натяжных потолков. Твоя цель — взять контакт клиента и записать на замер. Уточни: район, площадь комнат, желаемый тип потолка (матовый/глянцевый/тканевый). Если спросят про цены — сориентируй приблизительно и предложи бесплатный замер.",
  },
  {
    name: "Консультант магазина",
    prompt:
      "Ты — консультант интернет-магазина. Помоги выбрать товар, ответь на вопросы про доставку и оплату. Доставка по городу 1-2 дня, оплата картой или Kaspi. Если товар недоступен — предложи альтернативу.",
  },
  {
    name: "Бухгалтер для ИП",
    prompt:
      "Ты — бухгалтер для ИП в Казахстане. Помогай с базовыми вопросами по налогам на упрощёнке: ИПН 4%, ОСМС, ВОСМС, ОПВ. Если вопрос сложный — порекомендуй платную консультацию.",
  },
];

interface Props {
  instanceId: string;
  initial: {
    aiEnabled: boolean;
    aiModel: string;
    aiSystemPrompt: string | null;
    aiBusinessName: string | null;
    aiGreeting: string | null;
    aiMaxTurns: number;
    aiOnlyDuringHrs: boolean;
    aiWorkStartHr: number | null;
    aiWorkEndHr: number | null;
    aiEscalateOnHotLead: boolean;
    aiEscalateOnHandoff: boolean;
    aiHandoffMessage: string | null;
    aiKnowledgeBase: string | null;
  };
}

export function BotSettingsForm({ instanceId, initial }: Props) {
  const [aiEnabled, setAiEnabled] = useState(initial.aiEnabled);
  const [aiSystemPrompt, setAiSystemPrompt] = useState(initial.aiSystemPrompt || "");
  const [aiBusinessName, setAiBusinessName] = useState(initial.aiBusinessName || "");
  const [aiGreeting, setAiGreeting] = useState(initial.aiGreeting || "");
  const [aiMaxTurns, setAiMaxTurns] = useState(initial.aiMaxTurns);
  const [aiOnlyDuringHrs, setAiOnlyDuringHrs] = useState(initial.aiOnlyDuringHrs);
  const [aiWorkStartHr, setAiWorkStartHr] = useState(initial.aiWorkStartHr ?? 9);
  const [aiWorkEndHr, setAiWorkEndHr] = useState(initial.aiWorkEndHr ?? 19);
  const [aiEscalateOnHotLead, setAiEscalateOnHotLead] = useState(initial.aiEscalateOnHotLead);
  const [aiEscalateOnHandoff, setAiEscalateOnHandoff] = useState(initial.aiEscalateOnHandoff);
  const [aiHandoffMessage, setAiHandoffMessage] = useState(initial.aiHandoffMessage || "");
  const [aiKnowledgeBase, setAiKnowledgeBase] = useState(initial.aiKnowledgeBase || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/wa/instances/${instanceId}/bot`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiEnabled,
          aiSystemPrompt: aiSystemPrompt || null,
          aiBusinessName: aiBusinessName || null,
          aiGreeting: aiGreeting || null,
          aiMaxTurns,
          aiOnlyDuringHrs,
          aiWorkStartHr: aiOnlyDuringHrs ? aiWorkStartHr : null,
          aiWorkEndHr: aiOnlyDuringHrs ? aiWorkEndHr : null,
          aiEscalateOnHotLead,
          aiEscalateOnHandoff,
          aiHandoffMessage: aiHandoffMessage || null,
          aiKnowledgeBase: aiKnowledgeBase || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка сохранения");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (tpl: (typeof TEMPLATES)[0]) => {
    setAiSystemPrompt(tpl.prompt);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="glass rounded-2xl p-6 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={(e) => setAiEnabled(e.target.checked)}
            className="mt-1 w-5 h-5 rounded accent-brand-blue cursor-pointer"
          />
          <div>
            <div className="font-medium flex items-center gap-1.5">
              <Bot size={16} className="text-brand-blue" />
              Включить AI-бота
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Бот будет автоматически отвечать на входящие сообщения по заданной роли. Можно поставить
              чат на &laquo;пауза&raquo; вручную в Переписках.
            </p>
          </div>
        </label>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold flex items-center gap-2">
            <Sparkles size={16} className="text-brand-blue" /> Роль бота
          </h2>
          <span className="text-xs text-muted-foreground">{aiSystemPrompt.length} / 8000</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.name}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className="text-xs px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted transition"
            >
              {tpl.name}
            </button>
          ))}
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Системный промпт</label>
          <textarea
            value={aiSystemPrompt}
            onChange={(e) => setAiSystemPrompt(e.target.value)}
            rows={8}
            placeholder="Опиши кто этот бот и как он должен общаться: его цель, тон, что спрашивать, как закрывать на действие..."
            className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50 resize-none font-mono"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Название компании <span className="text-muted-foreground/60">(опц.)</span>
            </label>
            <input
              type="text"
              value={aiBusinessName}
              onChange={(e) => setAiBusinessName(e.target.value)}
              placeholder="KidsPark"
              className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Память (последние сообщения)
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={aiMaxTurns}
              onChange={(e) => setAiMaxTurns(parseInt(e.target.value) || 20)}
              className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
            />
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold flex items-center gap-2">
            <BookOpen size={16} className="text-brand-blue" /> База знаний компании
          </h2>
          <span className="text-xs text-muted-foreground">{aiKnowledgeBase.length} / 10000</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Цены, услуги, адрес, режим работы, частые вопросы — всё что бот должен знать о компании.
          AI будет искать ответы здесь.
        </p>
        <textarea
          value={aiKnowledgeBase}
          onChange={(e) => setAiKnowledgeBase(e.target.value)}
          rows={10}
          placeholder={`Адрес: г. Астана, ул. Кенесары 42\nРежим: пн-пт 9:00-19:00, сб-вс выходной\nТелефон офиса: +7 7172 555 333\n\nЦены:\n- Матовый потолок: от 2500₸/м²\n- Глянцевый: от 3200₸/м²\n- Тканевый: от 4500₸/м²\n\nЧасто спрашивают:\nВопрос: Сколько устанавливается?\nОтвет: В среднем 3-4 часа на одну комнату.\n\nВопрос: Есть гарантия?\nОтвет: Да, гарантия 10 лет на полотно.`}
          className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50 resize-none font-mono"
        />
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Bell size={16} className="text-brand-blue" /> Уведомления о лидах
        </h2>
        <p className="text-xs text-muted-foreground">
          Бот распознаёт &laquo;горячих&raquo; клиентов (готовых купить/записаться) и уведомляет вас в
          Telegram. Не пропустите ни одного лида. Настроить Telegram-чат можно в{" "}
          <Link href="/cabinet/settings" className="text-brand-blue hover:underline">
            настройках профиля
          </Link>
          .
        </p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={aiEscalateOnHotLead}
            onChange={(e) => setAiEscalateOnHotLead(e.target.checked)}
            className="mt-1 w-5 h-5 rounded accent-brand-blue cursor-pointer"
          />
          <div>
            <div className="text-sm font-medium">Уведомлять о горячих лидах</div>
            <p className="text-xs text-muted-foreground">
              Telegram-сообщение когда клиент готов купить/записаться
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={aiEscalateOnHandoff}
            onChange={(e) => setAiEscalateOnHandoff(e.target.checked)}
            className="mt-1 w-5 h-5 rounded accent-brand-blue cursor-pointer"
          />
          <div>
            <div className="text-sm font-medium flex items-center gap-1.5">
              <UserCheck size={14} /> Передача оператору
            </div>
            <p className="text-xs text-muted-foreground">
              Когда клиент просит &laquo;живого человека&raquo; — бот остановится в этом чате и
              отправит уведомление
            </p>
          </div>
        </label>

        {aiEscalateOnHandoff && (
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Сообщение клиенту при передаче
            </label>
            <input
              type="text"
              value={aiHandoffMessage}
              onChange={(e) => setAiHandoffMessage(e.target.value)}
              placeholder="Минутку, передаю менеджеру — он ответит в течение часа"
              className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
            />
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold">Рабочие часы</h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={aiOnlyDuringHrs}
            onChange={(e) => setAiOnlyDuringHrs(e.target.checked)}
            className="w-5 h-5 rounded accent-brand-blue cursor-pointer"
          />
          <span className="text-sm">
            Отвечать только в рабочее время (иначе клиент увидит молчание бота)
          </span>
        </label>

        {aiOnlyDuringHrs && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">С</label>
              <input
                type="number"
                min={0}
                max={23}
                value={aiWorkStartHr}
                onChange={(e) => setAiWorkStartHr(parseInt(e.target.value) || 0)}
                className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">До</label>
              <input
                type="number"
                min={0}
                max={23}
                value={aiWorkEndHr}
                onChange={(e) => setAiWorkEndHr(parseInt(e.target.value) || 0)}
                className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3 sticky bottom-4">
        <Button type="submit" disabled={saving} className="rounded-xl gap-2">
          <Save size={14} />
          {saving ? "Сохраняем..." : "Сохранить"}
        </Button>
        {saved && <span className="text-sm text-green-400">✓ Сохранено</span>}
        <span className="text-xs text-muted-foreground ml-auto">
          Попробуй промпт во вкладке &laquo;Тест-чат&raquo; перед запуском на реальных клиентах.
        </span>
      </div>
    </form>
  );
}
