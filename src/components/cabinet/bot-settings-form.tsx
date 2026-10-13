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

const LEAD_FIELD_PRESETS: { name: string; fields: string }[] = [
  { name: "Туры и круизы", fields: "Имя\nГород\nИнтерес (тур или круиз)\nБыл ли в круизе\nДаты\nБюджет" },
  { name: "Услуги и запись", fields: "Имя\nУслуга\nЖелаемая дата\nРайон" },
  { name: "Ремонт и замер", fields: "Имя\nАдрес или район\nПлощадь\nСроки\nБюджет" },
];

interface Props {
  instanceId: string;
  groups?: { jid: string; name: string; size?: number }[];
  connected?: boolean;
  initial: {
    aiLeadFields: string | null;
    aiReportGroupJid: string | null;
    aiDailyDigest: boolean;
    aiDigestHour: number;
    aiEnabled: boolean;
    aiModel: string;
    aiSystemPrompt: string | null;
    aiBusinessName: string | null;
    aiGreeting: string | null;
    aiMaxTurns: number;
    aiOnlyDuringHrs: boolean;
    aiWorkStartHr: number | null;
    aiWorkEndHr: number | null;
    aiTimezone: string;
    aiWorkDays: number[];
    aiOffDaysActive: boolean;
    aiEscalateOnHotLead: boolean;
    aiEscalateOnHandoff: boolean;
    aiHandoffMessage: string | null;
    aiKnowledgeBase: string | null;
  };
}

const TIMEZONES = [
  { value: "Asia/Almaty", label: "Алматы, Астана (UTC+5)" },
  { value: "Asia/Aqtobe", label: "Актобе, Атырау, Уральск (UTC+5)" },
  { value: "Asia/Bishkek", label: "Бишкек (UTC+6)" },
  { value: "Asia/Tashkent", label: "Ташкент (UTC+5)" },
  { value: "Asia/Baku", label: "Баку (UTC+4)" },
  { value: "Europe/Moscow", label: "Москва (UTC+3)" },
  { value: "Asia/Yekaterinburg", label: "Екатеринбург (UTC+5)" },
  { value: "Asia/Novosibirsk", label: "Новосибирск (UTC+7)" },
  { value: "Asia/Dubai", label: "Дубай (UTC+4)" },
  { value: "Europe/Istanbul", label: "Стамбул (UTC+3)" },
];

const DAYS = [
  { n: 1, label: "Пн" },
  { n: 2, label: "Вт" },
  { n: 3, label: "Ср" },
  { n: 4, label: "Чт" },
  { n: 5, label: "Пт" },
  { n: 6, label: "Сб" },
  { n: 7, label: "Вс" },
];

const DAY_INPUT =
  "w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50";

export function BotSettingsForm({ instanceId, initial, groups = [], connected = false }: Props) {
  const [aiEnabled, setAiEnabled] = useState(initial.aiEnabled);
  const [aiLeadFields, setAiLeadFields] = useState(initial.aiLeadFields || "");
  const [aiReportGroupJid, setAiReportGroupJid] = useState(initial.aiReportGroupJid || "");
  const [aiDailyDigest, setAiDailyDigest] = useState(initial.aiDailyDigest);
  const [aiDigestHour, setAiDigestHour] = useState(initial.aiDigestHour ?? 9);
  const [aiSystemPrompt, setAiSystemPrompt] = useState(initial.aiSystemPrompt || "");
  const [aiBusinessName, setAiBusinessName] = useState(initial.aiBusinessName || "");
  const [aiGreeting, setAiGreeting] = useState(initial.aiGreeting || "");
  const [aiMaxTurns, setAiMaxTurns] = useState(initial.aiMaxTurns);
  const [aiOnlyDuringHrs, setAiOnlyDuringHrs] = useState(initial.aiOnlyDuringHrs);
  const [aiWorkStartHr, setAiWorkStartHr] = useState(initial.aiWorkStartHr ?? 9);
  const [aiWorkEndHr, setAiWorkEndHr] = useState(initial.aiWorkEndHr ?? 19);
  const [aiTimezone, setAiTimezone] = useState(initial.aiTimezone || "Asia/Almaty");
  const [aiWorkDays, setAiWorkDays] = useState<number[]>(
    initial.aiWorkDays?.length ? initial.aiWorkDays : [1, 2, 3, 4, 5, 6, 7],
  );
  const [aiOffDaysActive, setAiOffDaysActive] = useState(initial.aiOffDaysActive);
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
          aiTimezone,
          aiWorkDays,
          aiOffDaysActive,
          aiEscalateOnHotLead,
          aiEscalateOnHandoff,
          aiHandoffMessage: aiHandoffMessage || null,
          aiKnowledgeBase: aiKnowledgeBase || null,
          aiLeadFields: aiLeadFields || null,
          aiReportGroupJid: aiReportGroupJid || null,
          aiDailyDigest,
          aiDigestHour,
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
        <h2 className="font-semibold">Лиды и отчёты менеджерам</h2>
        <p className="text-sm text-muted-foreground">
          Бот по ходу разговора выясняет эти поля и, как только собрал, отправляет отчёт «# Report» в
          группу WhatsApp и в Telegram. Одно поле на строку.
        </p>
        <div className="flex flex-wrap gap-2">
          {LEAD_FIELD_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setAiLeadFields(p.fields)}
              className="rounded-full border border-border/50 px-3 py-1 text-xs hover:bg-muted/40 transition"
            >
              {p.name}
            </button>
          ))}
        </div>
        <textarea
          id="aiLeadFields"
          value={aiLeadFields}
          onChange={(e) => setAiLeadFields(e.target.value)}
          rows={5}
          placeholder={"Имя\nГород\nИнтерес (тур или круиз)\nБыл ли в круизе\nДаты"}
          className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50 font-mono"
        />
        <div>
          <label htmlFor="aiReportGroupJid" className="text-sm text-muted-foreground mb-1 block">
            Группа WhatsApp для отчётов
          </label>
          <select
            id="aiReportGroupJid"
            value={aiReportGroupJid}
            onChange={(e) => setAiReportGroupJid(e.target.value)}
            className={DAY_INPUT}
          >
            <option value="">Не отправлять в группу (только Telegram)</option>
            {groups.map((g) => (
              <option key={g.jid} value={g.jid}>
                {g.name}
                {g.size ? ` · ${g.size}` : ""}
              </option>
            ))}
            {aiReportGroupJid && !groups.some((g) => g.jid === aiReportGroupJid) && (
              <option value={aiReportGroupJid}>{initial.aiReportGroupJid === aiReportGroupJid ? "Выбранная группа" : aiReportGroupJid}</option>
            )}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {groups.length
              ? "Список групп, где состоит этот номер. Обновляется при каждом подключении номера."
              : connected
                ? "Список групп ещё загружается, обновите страницу через минуту."
                : "Подключите номер, и здесь появятся его группы. Отчёт уходит от этого же номера."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              id="aiDailyDigest"
              type="checkbox"
              checked={aiDailyDigest}
              onChange={(e) => setAiDailyDigest(e.target.checked)}
              className="w-5 h-5 rounded accent-brand-blue cursor-pointer"
            />
            <span className="text-sm">Утренняя сводка за вчера: диалоги, лиды, встречи</span>
          </label>
          {aiDailyDigest && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              в
              <input
                id="aiDigestHour"
                type="number"
                min={0}
                max={23}
                value={aiDigestHour}
                onChange={(e) => setAiDigestHour(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-16 rounded-xl bg-muted/50 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
              />
              :00 по часовому поясу из расписания
            </label>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold">Расписание бота</h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={aiOnlyDuringHrs}
            onChange={(e) => setAiOnlyDuringHrs(e.target.checked)}
            className="w-5 h-5 rounded accent-brand-blue cursor-pointer"
          />
          <span className="text-sm">
            Отвечать по расписанию (вне расписания бот молчит, пишет менеджер)
          </span>
        </label>

        {aiOnlyDuringHrs && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setAiWorkStartHr(18);
                  setAiWorkEndHr(9);
                  setAiWorkDays([1, 2, 3, 4, 5]);
                  setAiOffDaysActive(true);
                }}
                className="rounded-full border border-border/50 px-3 py-1 text-xs hover:bg-muted/40 transition"
              >
                Подменять менеджера: вечером, ночью и в выходные
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiWorkStartHr(9);
                  setAiWorkEndHr(19);
                  setAiWorkDays([1, 2, 3, 4, 5]);
                  setAiOffDaysActive(false);
                }}
                className="rounded-full border border-border/50 px-3 py-1 text-xs hover:bg-muted/40 transition"
              >
                Только в рабочее время: 9–19, пн–пт
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Бот отвечает с</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={aiWorkStartHr}
                  onChange={(e) => setAiWorkStartHr(parseInt(e.target.value) || 0)}
                  className={DAY_INPUT}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">до</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={aiWorkEndHr}
                  onChange={(e) => setAiWorkEndHr(parseInt(e.target.value) || 0)}
                  className={DAY_INPUT}
                />
              </div>
            </div>
            {aiWorkStartHr > aiWorkEndHr && (
              <p className="text-xs text-muted-foreground">
                Окно через полночь: бот отвечает с {aiWorkStartHr}:00 до {aiWorkEndHr}:00 следующего дня.
              </p>
            )}

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Часовой пояс</label>
              <select
                value={aiTimezone}
                onChange={(e) => setAiTimezone(e.target.value)}
                className={DAY_INPUT}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Эти часы действуют в дни</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => {
                  const on = aiWorkDays.includes(d.n);
                  return (
                    <button
                      key={d.n}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setAiWorkDays((prev) =>
                          on ? prev.filter((x) => x !== d.n) : [...prev, d.n].sort(),
                        )
                      }
                      className={`w-11 rounded-xl py-2 text-sm transition ${
                        on ? "bg-brand-blue text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {aiWorkDays.length < 7 && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">В остальные дни</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="offdays"
                      checked={aiOffDaysActive}
                      onChange={() => setAiOffDaysActive(true)}
                      className="accent-brand-blue"
                    />
                    бот отвечает весь день (менеджера нет, подменяет бот)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="offdays"
                      checked={!aiOffDaysActive}
                      onChange={() => setAiOffDaysActive(false)}
                      className="accent-brand-blue"
                    />
                    бот молчит
                  </label>
                </div>
              </div>
            )}
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
