"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export default function CabinetSignupPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError("Подтвердите согласие с офертой и политикой конфиденциальности");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/cabinet/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, tenantName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        return;
      }
      router.push("/cabinet/setup");
      router.refresh();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold gradient-text">Jamiwa</h1>
          <p className="text-sm text-muted-foreground mt-2">
            WhatsApp для бизнеса · Создать аккаунт
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Название компании</label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="ТОО Натяжные потолки"
              className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
              required
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Ваше имя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Нариман"
              className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
              required
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">
              Пароль <span className="text-muted-foreground/60">(минимум 8 символов)</span>
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
              required
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-brand-blue cursor-pointer"
            />
            <span>
              Я принимаю условия{" "}
              <Link
                href="/legal/offer"
                target="_blank"
                className="text-brand-blue hover:underline"
              >
                публичной оферты
              </Link>{" "}
              и{" "}
              <Link
                href="/legal/privacy"
                target="_blank"
                className="text-brand-blue hover:underline"
              >
                политики конфиденциальности
              </Link>
            </span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" className="w-full rounded-xl gap-2" disabled={loading || !acceptedTerms}>
            <UserPlus size={16} />
            {loading ? "Создаём..." : "Создать аккаунт"}
          </Button>

          <p className="text-xs text-center text-muted-foreground pt-2">
            Уже есть аккаунт?{" "}
            <Link href="/cabinet/login" className="text-brand-blue hover:underline">
              Войти
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
