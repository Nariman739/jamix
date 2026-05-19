import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentTenantUser } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import { SetupAssistant } from "@/components/cabinet/setup-assistant";

export default async function SetupPage() {
  const user = await getCurrentTenantUser();
  if (!user) redirect("/cabinet/login");

  // Если уже есть настроенный инстанс — покажем продолжение в нём
  const existing = await prisma.wAInstance.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <Link
        href="/cabinet"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> В кабинет
      </Link>

      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">Настройка AI-помощника</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Поговори со мной 2-3 минуты — задам несколько вопросов про твой бизнес и сам соберу AI-бота под него. После этого сможешь сразу протестировать.
        </p>
      </header>

      <SetupAssistant existingInstanceId={existing?.id ?? null} />
    </div>
  );
}
