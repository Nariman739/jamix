import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const session = await prisma.chatSession.findUnique({
      where: { id },
    });

    if (!session) {
      return Response.json({ error: "Не найдено" }, { status: 404 });
    }

    return Response.json(session);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Не авторизован" }, { status: 401 });
    }
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const { status, notes } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const session = await prisma.chatSession.update({
      where: { id },
      data: updateData,
    });

    return Response.json(session);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Не авторизован" }, { status: 401 });
    }
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
