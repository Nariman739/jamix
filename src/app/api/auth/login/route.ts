import { prisma } from "@/lib/prisma";
import { verifyPassword, createAdminSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({ error: "Заполните все поля" }, { status: 400 });
    }

    const admin = await prisma.adminUser.findUnique({ where: { username } });
    if (!admin) {
      return Response.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      return Response.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    await createAdminSession(admin.id);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
