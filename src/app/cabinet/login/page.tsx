"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function CabinetLoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get("next") || "/cabinet";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/cabinet/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка входа");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold gradient-text">Jamiwa</h1>
          <p className="text-sm text-muted-foreground mt-2">WhatsApp для бизнеса · Вход</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
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
            <label className="text-sm text-muted-foreground mb-1 block">Пароль</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-muted/50 px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-blue/50"
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button type="submit" className="w-full rounded-xl gap-2" disabled={loading}>
            <LogIn size={16} />
            {loading ? "Вход..." : "Войти"}
          </Button>

          <p className="text-xs text-center text-muted-foreground pt-2">
            Нет аккаунта?{" "}
            <Link href="/cabinet/signup" className="text-brand-blue hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
