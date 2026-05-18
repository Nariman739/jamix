import { NextRequest, NextResponse } from "next/server";
import { loginTenant } from "@/lib/tenant-auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as { email?: string; password?: string };
    if (!email || !password) {
      return NextResponse.json({ error: "Введите email и пароль" }, { status: 400 });
    }

    const user = await loginTenant(email, password);
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  }
}
