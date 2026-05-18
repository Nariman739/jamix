import { redirect } from "next/navigation";
import { getCurrentTenantUser } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/cabinet/settings-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function SettingsPage() {
  const user = await getCurrentTenantUser();
  if (!user) redirect("/cabinet/login");

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) redirect("/cabinet");

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <Link
        href="/cabinet"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft size={14} /> Назад в кабинет
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Настройки</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Компания, уведомления, тариф
        </p>
      </div>

      <SettingsForm
        initial={{
          name: tenant.name,
          plan: tenant.plan,
          telegramChatId: tenant.telegramChatId,
        }}
      />
    </div>
  );
}
