import { redirect, notFound } from "next/navigation";
import { getCurrentTenantUser } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import { ChatsView } from "@/components/cabinet/chats-view";
import { InstanceTabs } from "@/components/cabinet/instance-tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ChatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentTenantUser();
  if (!user) redirect("/cabinet/login");

  const instance = await prisma.wAInstance.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!instance) notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <Link
        href="/cabinet"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft size={14} /> Назад к списку
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{instance.label || `+${instance.phoneNumber || "..."}`}</h1>
        <p className="text-sm text-muted-foreground mt-1">Переписки с клиентами</p>
      </div>

      <InstanceTabs id={instance.id} active="chats" />

      <ChatsView instanceId={instance.id} aiEnabled={instance.aiEnabled} />
    </div>
  );
}
