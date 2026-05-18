import { redirect } from "next/navigation";
import { getCurrentTenantUser } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import { ApiKeyPanel } from "@/components/cabinet/api-key-panel";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ApiKeysPage() {
  const user = await getCurrentTenantUser();
  if (!user) redirect("/cabinet/login");

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) redirect("/cabinet");

  const firstInstance = await prisma.wAInstance.findFirst({
    where: { tenantId: user.tenantId },
    select: { id: true },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <Link
        href="/cabinet"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft size={14} /> Назад в кабинет
      </Link>

      <div>
        <h1 className="text-2xl font-bold">API ключи</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Подключите Jamiwa к вашим системам — n8n, CRM, сайту, AI-агенту
        </p>
      </div>

      <ApiKeyPanel apiKeyHint={tenant.apiKeyHint} instanceId={firstInstance?.id || null} />
    </div>
  );
}
