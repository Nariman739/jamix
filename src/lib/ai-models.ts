// Белый список моделей для бота. Любая другая строка в aiModel отклоняется:
// иначе арендатор через API ставит дорогую модель, а платит наш ключ OpenRouter.
// Цены OpenRouter на 13.10.2026 (за 1M токенов, вход/выход):
//   claude-haiku-5.5  $0.10 / $0.50 — самый дешёвый, качество русского/казахского ещё не проверяли
//   claude-haiku-4.5  $1 / $5
//   claude-sonnet-5.5 $2 / $10  — по умолчанию (качество диалога важнее, см. аудит 13.10)
export const ALLOWED_MODELS = [
  "anthropic/claude-sonnet-5.5",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-haiku-5.5",
] as const;

export type AllowedModel = (typeof ALLOWED_MODELS)[number];

export const DEFAULT_MODEL: AllowedModel = "anthropic/claude-sonnet-5.5";

export function isAllowedModel(m: unknown): m is AllowedModel {
  return typeof m === "string" && (ALLOWED_MODELS as readonly string[]).includes(m);
}

export const MODEL_LABELS: Record<AllowedModel, string> = {
  "anthropic/claude-sonnet-5.5": "Claude Sonnet 5.5 — умнее, дороже (по умолчанию)",
  "anthropic/claude-haiku-4.5": "Claude Haiku 4.5 — быстрее и дешевле",
  "anthropic/claude-haiku-5.5": "Claude Haiku 5.5 — самый дешёвый",
};
