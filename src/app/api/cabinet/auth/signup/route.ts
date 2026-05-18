import { NextRequest, NextResponse } from "next/server";
import { signupTenant } from "@/lib/tenant-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, tenantName } = body as {
      email?: string;
      password?: string;
      name?: string;
      tenantName?: string;
    };

    if (!email || !password || !tenantName) {
      return NextResponse.json({ error: "Email, пароль и название компании обязательны" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Пароль минимум 8 символов" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
    }

    const user = await signupTenant({ email, password, name, tenantName });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка регистрации";
    const status = msg.includes("already") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
