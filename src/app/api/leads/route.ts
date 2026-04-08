import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isArchived: false };

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { contactName: { contains: search, mode: "insensitive" } },
        { businessType: { contains: search, mode: "insensitive" } },
        { contactPhone: { contains: search } },
        { contactTelegram: { contains: search, mode: "insensitive" } },
      ];
    }

    const sessions = await prisma.chatSession.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        contactName: true,
        contactPhone: true,
        contactTelegram: true,
        businessType: true,
        status: true,
        qualificationScore: true,
        messageCount: true,
        createdAt: true,
        updatedAt: true,
        leadData: true,
      },
      take: 100,
    });

    // Stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [totalToday, totalWeek, totalLeads] = await Promise.all([
      prisma.chatSession.count({ where: { createdAt: { gte: today } } }),
      prisma.chatSession.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.chatSession.count({ where: { status: "LEAD_CAPTURED" } }),
    ]);

    return Response.json({
      sessions,
      stats: { totalToday, totalWeek, totalLeads },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Не авторизован" }, { status: 401 });
    }
    console.error("Leads error:", error);
    return Response.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
