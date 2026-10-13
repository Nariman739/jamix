// Общий модуль промпта и разбора ответа модели. Используется и воркером (worker/src/ai-reply.ts),
// и кабинетом (тест-чат «Попробовать»), чтобы тест проверял ровно того бота, который отвечает клиентам.
// Здесь НЕТ prisma/openai — только чистые функции.

export interface InstanceConfig {
  id: string;
  tenantId: string;
  label: string | null;
  aiEnabled: boolean;
  aiModel: string;
  aiSystemPrompt: string | null;
  aiBusinessName: string | null;
  aiMaxTurns: number;
  aiOnlyDuringHrs: boolean;
  aiWorkStartHr: number | null;
  aiWorkEndHr: number | null;
  aiTimezone: string;
  aiWorkDays: number[];
  aiOffDaysActive: boolean;
  aiPausedChats: string[];
  aiEscalateOnHotLead: boolean;
  aiEscalateOnHandoff: boolean;
  aiHandoffMessage: string | null;
  aiKnowledgeBase: string | null;
  aiLeadFields: string | null;
  aiReportGroupJid: string | null;
}

/** Поля лида из настроек: по одному на строку, пустые и дубли выкидываем. */
export function parseLeadFields(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/\r?\n|;/)
        .map((s) => s.trim().replace(/^[-•*\d.)\s]+/, "").trim())
        .filter(Boolean),
    ),
  ).slice(0, 15);
}

/** Час (0-23) и день недели ISO (1=пн … 7=вс) в таймзоне клиента. При кривой таймзоне — Asia/Almaty. */
export function localHourAndDay(date: Date, timeZone: string): { hour: number; day: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", hour: "numeric", weekday: "short" }).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Almaty", hourCycle: "h23", hour: "numeric", weekday: "short" }).formatToParts(date);
  }
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd) + 1 || 1;
  return { hour, day };
}

/**
 * Расписание бота. Окно часов [start, end) действует в aiWorkDays; окно может переходить через
 * полночь (18 → 9 = бот отвечает вечером и ночью). В остальные дни бот либо отвечает весь день
 * (aiOffDaysActive — режим «подменяю менеджера в выходные»), либо молчит.
 */
export function isWithinSchedule(
  inst: Pick<InstanceConfig, "aiWorkStartHr" | "aiWorkEndHr" | "aiTimezone" | "aiWorkDays" | "aiOffDaysActive">,
  now: Date,
): boolean {
  const { hour, day } = localHourAndDay(now, inst.aiTimezone || "Asia/Almaty");
  const days = inst.aiWorkDays?.length ? inst.aiWorkDays : [1, 2, 3, 4, 5, 6, 7];
  const start = inst.aiWorkStartHr ?? 0;
  const end = inst.aiWorkEndHr ?? 24;
  const wraps = start > end;
  const inWindow = wraps ? hour >= start || hour < end : hour >= start && hour < end;

  if (wraps && hour < end) {
    // Ночной хвост окна (после полуночи) относится к предыдущему дню: вечер пятницы продолжается в ночь субботы.
    const prev = day === 1 ? 7 : day - 1;
    if (days.includes(prev)) return true;
    if (days.includes(day)) return inWindow;
    return inst.aiOffDaysActive;
  }
  if (days.includes(day)) return inWindow;
  return inst.aiOffDaysActive;
}

// ===== buildSystemPrompt =====
export interface PromptContext {
  chatName: string | null;
  leadData: LeadData | null;
  lastContactAt: Date | null;
  firstBotMessage: boolean; // бот ещё ни разу не писал этому клиенту
}

const MONTHS_RU = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const WEEKDAYS_RU = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];

/** «суббота, 14 ноября 2026, 01:30» в таймзоне номера. */
export function formatLocalDateTime(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const { day: wd } = localHourAndDay(date, timeZone);
    return `${WEEKDAYS_RU[wd - 1]}, ${parseInt(get("day"), 10)} ${MONTHS_RU[parseInt(get("month"), 10) - 1]} ${get("year")}, ${get("hour")}:${get("minute")}`;
  } catch {
    return date.toISOString();
  }
}

/**
 * Работает ли сейчас менеджер и когда появится. Логика: если бот включён «по расписанию»,
 * то вне окна бота отвечает менеджер. Если бот круглосуточный — про менеджера не знаем.
 */
export function managerStatus(inst: InstanceConfig, now = new Date()): { working: boolean | null; nextStart: string | null } {
  if (!inst.aiOnlyDuringHrs || inst.aiWorkStartHr == null || inst.aiWorkEndHr == null) {
    return { working: null, nextStart: null };
  }
  const botActive = isWithinSchedule(inst, now);
  if (!botActive) return { working: true, nextStart: null };
  // Бот активен → менеджер появится, когда окно бота закроется (aiWorkEndHr) в ближайший рабочий день
  const tz = inst.aiTimezone || "Asia/Almaty";
  const { hour, day } = localHourAndDay(now, tz);
  const days = inst.aiWorkDays?.length ? inst.aiWorkDays : [1, 2, 3, 4, 5, 6, 7];
  const end = inst.aiWorkEndHr;
  const wraps = inst.aiWorkStartHr > end;
  // Окно через полночь (18→9): менеджер с 9:00 в рабочий день
  if (wraps) {
    if (days.includes(day) && hour < end) return { working: false, nextStart: `сегодня с ${end}:00` };
    for (let i = 1; i <= 7; i++) {
      const d = ((day - 1 + i) % 7) + 1;
      if (days.includes(d)) return { working: false, nextStart: `${i === 1 ? "завтра" : "в " + WEEKDAYS_RU[d - 1].replace(/а$/, "у")} с ${end}:00` };
    }
    return { working: false, nextStart: null };
  }
  // Обычное окно (9→19): бот днём, менеджер вечером — редкий кейс
  return { working: false, nextStart: `сегодня с ${end}:00` };
}

export function buildSystemPrompt(inst: InstanceConfig, ctx: PromptContext): string {
  const tz = inst.aiTimezone || "Asia/Almaty";
  const business = inst.aiBusinessName || "компании";
  const leadFields = parseLeadFields(inst.aiLeadFields);
  const ms = managerStatus(inst);
  const managerLine =
    ms.working === true
      ? "менеджер сейчас на связи"
      : ms.working === false
        ? `менеджер сейчас не работает, ответит ${ms.nextStart || "в ближайшее рабочее время"}`
        : "менеджер подключится, если понадобится";

  const known = ctx.leadData?.fields ? Object.entries(ctx.leadData.fields).map(([k, v]) => `${k}: ${v}`).join("; ") : "";
  const gapDays = ctx.lastContactAt ? Math.floor((Date.now() - ctx.lastContactAt.getTime()) / 86_400_000) : null;

  const lines: string[] = [];
  lines.push(
    `Ты — виртуальный помощник компании «${business}» в WhatsApp. Ты ИИ-ассистент и не скрываешь этого. ` +
      `Твоя задача — быстро и по-человечески ответить клиенту, помочь ему, собрать данные для менеджера и договориться о следующем шаге.`,
  );
  lines.push("", "О КОМПАНИИ И РОЛИ (заполнено владельцем):", inst.aiSystemPrompt || "(не заполнено)");
  lines.push("", "ЖЁСТКИЕ ПРАВИЛА:");
  lines.push(
    `1. Честность про ИИ. ${ctx.firstBotMessage ? `Это твоё первое сообщение этому клиенту: начни с короткого «Здравствуйте! Я виртуальный помощник «${business}». Если нужно, подключу менеджера.» ` : ""}Если спросят «вы бот / живой человек?» — всегда честно: «Я виртуальный помощник, но могу передать вас менеджеру».`,
  );
  lines.push(
    "2. Только факты из базы знаний. Цены, скидки, акции, даты, наличие мест, сроки, условия оплаты и возврата называй ТОЛЬКО так, как они написаны в базе ниже. Не округляй, не считай скидки, не обещай того, чего там нет. Если ответа в базе нет — скажи «Уточню у менеджера и вернусь с ответом» и поставь токен [ASK: …].",
  );
  lines.push("3. Не противоречь менеджеру. Сообщения с пометкой «(менеджер)» в истории — это слова живого сотрудника. Опирайся на них, не меняй договорённости.");
  lines.push("4. Не назначай точное время встречи или звонка сам: спроси, когда клиенту удобно, и скажи, что менеджер подтвердит.");
  lines.push("5. Если клиент просит больше не писать — ответь одной фразой «Хорошо, больше не побеспокоим. Если понадобится — пишите.» и поставь [DNC]. «Отпишитесь», «напишите мне», «почему не пишете» значат обратное — клиент ждёт ответа.");
  lines.push("6. Не обсуждай политику, религию, конкурентов, не давай юридических и медицинских советов. На грубость отвечай спокойно и предлагай менеджера.");
  lines.push("", "КАК ПИСАТЬ:");
  lines.push("- Как живой менеджер в WhatsApp: 1–3 коротких предложения, одна мысль — одно сообщение. Не больше одного вопроса за раз.");
  lines.push("- Обращайся на «Вы», по имени, если его знаешь. Не здоровайся повторно, если уже здоровались в этом диалоге.");
  lines.push("- Без канцелярита («Благодарим за обращение», «Ваш запрос принят», «Рады помочь!»). Пиши «Понял», «Сейчас подскажу», «Да, есть».");
  lines.push("- Эмодзи — максимум один и не в каждом сообщении. Без markdown: никаких **, #, таблиц и списков с дефисами. Выделить — *одной звёздочкой*.");
  lines.push("- Отвечай на языке клиента: по-русски или по-казахски (если пишет на казахском или смешанно — отвечай на казахском, простыми словами).");
  lines.push("- Если клиент прислал несколько сообщений подряд — ответь на всё одним сообщением.");
  lines.push("- Пример хорошего ответа: «Да, на 23 декабря места есть. Сколько вас будет и нужны ли детские места?»");
  lines.push("- Пример плохого ответа: «Здравствуйте! 😊 Благодарим за Ваш интерес к нашей компании! Мы с радостью поможем Вам!»");
  lines.push("", "СЕЙЧАС:");
  lines.push(`- Дата и время: ${formatLocalDateTime(new Date(), tz)} (${tz}).`);
  lines.push(`- ${managerLine}. Если менеджер не работает, не обещай быстрый звонок — говори, когда он ответит на самом деле.`);
  lines.push("", "О КЛИЕНТЕ:");
  lines.push(`- Имя в WhatsApp: ${ctx.chatName || "неизвестно"}`);
  lines.push(`- Уже известно: ${known || "ничего"}. Не переспрашивай то, что уже известно.`);
  if (gapDays != null && gapDays >= 3) lines.push(`- Клиент вернулся после перерыва (${gapDays} дн.) — уточни, актуален ли прошлый запрос.`);
  if (leadFields.length) {
    lines.push("", `ЧТО ВЫЯСНИТЬ (по ходу разговора, естественно, по одному вопросу): ${leadFields.join(", ")}.`);
  }
  lines.push("", `БАЗА ЗНАНИЙ «${business}» (единственный источник цен и условий):`, "<<<", inst.aiKnowledgeBase || "(база знаний пуста — цены и условия не называй, предлагай уточнить у менеджера)", ">>>");
  lines.push("", "СЛУЖЕБНЫЕ ТОКЕНЫ (клиент их не видит; каждый — в самом конце ответа, на отдельной строке, без кавычек и кода):");
  if (leadFields.length) {
    lines.push(
      `[LEAD: {"status":"qualified"|"meeting","fields":{"<поле из списка>":"<как сказал клиент>"},"meeting":{"datetime":"<абсолютная дата, напр. 14 ноября 2026, 11:00>","format":"<звонок/офис/онлайн>"}|null}] — когда знаешь имя и хотя бы ещё одно поле; всегда полный актуальный JSON; ключи — ровно названия полей из списка.`,
    );
  }
  if (inst.aiEscalateOnHotLead) lines.push("[ESCALATE: кратко, что хочет клиент] — клиент готов купить, забронировать или просит счёт.");
  if (inst.aiEscalateOnHandoff) {
    lines.push(
      `[HANDOFF] — клиент просит живого человека, жалуется или вопрос явно не для тебя. Клиенту скажи: «Передаю менеджеру — он ответит ${ms.nextStart || "в ближайшее время"}».`,
    );
  }
  lines.push("[ASK: вопрос клиента] — ответа нет в базе знаний.");
  lines.push("[DNC] — клиент просит больше не писать.");
  return lines.join("\n");
}

// ===== parse =====
export interface LeadData {
  status: "qualified" | "meeting";
  fields: Record<string, string>;
  meeting: { datetime?: string; format?: string } | null;
}

export interface ReplyResult {
  reply: string;
  escalate?: { reason: string } | null;
  handoff?: boolean;
  lead?: LeadData | null;
  ask?: string | null;
  dnc?: boolean;
}

/** Вырезает [LEAD: {...}] с учётом вложенных скобок JSON. */
function extractLeadToken(text: string): { lead: LeadData | null; text: string } {
  const start = text.search(/\[LEAD:/i);
  if (start < 0) return { lead: null, text };
  const jsonStart = text.indexOf("{", start);
  if (jsonStart < 0) return { lead: null, text: text.slice(0, start).trim() };
  let depth = 0;
  let end = -1;
  for (let i = jsonStart; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return { lead: null, text: text.slice(0, start).trim() };
  const closeBracket = text.indexOf("]", end);
  const cleaned = (text.slice(0, start) + text.slice(closeBracket >= 0 ? closeBracket + 1 : end + 1)).trim();
  try {
    const parsed = JSON.parse(text.slice(jsonStart, end + 1)) as Partial<LeadData>;
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.fields || {})) {
      if (v == null) continue;
      const s = sanitizeField(String(v));
      if (s && !/^(неизвестно|не указано|null|—|-)$/i.test(s)) fields[k.trim().slice(0, 60)] = s;
    }
    if (!Object.keys(fields).length) return { lead: null, text: cleaned };
    const meeting =
      parsed.meeting && typeof parsed.meeting === "object"
        ? {
            datetime: parsed.meeting.datetime ? sanitizeField(String(parsed.meeting.datetime)).slice(0, 120) : undefined,
            format: parsed.meeting.format ? sanitizeField(String(parsed.meeting.format)).slice(0, 80) : undefined,
          }
        : null;
    // «встреча» только если в дате есть хоть одна цифра (иначе модель написала «когда удобно»)
    const meetingOk = !!meeting?.datetime && /\d/.test(meeting.datetime);
    const status: LeadData["status"] = parsed.status === "meeting" && meetingOk ? "meeting" : "qualified";
    return { lead: { status, fields, meeting: meetingOk ? meeting : null }, text: cleaned };
  } catch {
    return { lead: null, text: cleaned };
  }
}

/** Значения полей идут в отчёт менеджерам как есть — режем ссылки, переводы строк и длину. */
function sanitizeField(s: string): string {
  return s.replace(/https?:\/\/\S+/gi, "[ссылка]").replace(/\s+/g, " ").trim().slice(0, 120);
}

/** Чистим ответ: markdown → WhatsApp, обрывки служебных токенов, лишние пустые строки. */
function cleanReply(text: string): string {
  let t = text;
  // обрезанный max_tokens'ом токен без закрывающей скобки — от начала токена до конца строки
  t = t.replace(/\[(LEAD|ESCALATE|HANDOFF|ASK|DNC)[^\n]*$/gim, "");
  t = t.replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, ""));
  t = t.replace(/\*\*(.+?)\*\*/g, "*$1*"); // **жирный** → *жирный*
  t = t.replace(/^#{1,6}\s+/gm, ""); // заголовки
  t = t.replace(/^\s*[-•]\s+/gm, "• "); // списки
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

export function parseControlTokens(raw: string): ReplyResult {
  let escalate: { reason: string } | null = null;
  let handoff = false;
  let ask: string | null = null;
  let dnc = false;

  const leadRes = extractLeadToken(raw);
  let text = leadRes.text;

  const escMatch = text.match(/\[ESCALATE:\s*([^\]]+)\]/i);
  if (escMatch) {
    escalate = { reason: sanitizeField(escMatch[1]) };
    text = text.replace(escMatch[0], "").trim();
  }
  const askMatch = text.match(/\[ASK:\s*([^\]]+)\]/i);
  if (askMatch) {
    ask = sanitizeField(askMatch[1]);
    text = text.replace(askMatch[0], "").trim();
  }
  if (/\[HANDOFF\]/i.test(text)) {
    handoff = true;
    text = text.replace(/\[HANDOFF\]/gi, "").trim();
  }
  if (/\[DNC\]/i.test(text)) {
    dnc = true;
    text = text.replace(/\[DNC\]/gi, "").trim();
  }
  return { reply: cleanReply(text), escalate, handoff, lead: leadRes.lead, ask, dnc };
}
