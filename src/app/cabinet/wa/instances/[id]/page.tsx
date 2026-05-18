import { redirect, notFound } from "next/navigation";
import { getCurrentTenantUser } from "@/lib/tenant-auth";
import { prisma } from "@/lib/prisma";
import { InstanceCard } from "@/components/cabinet/instance-card";
import { InstanceTabs } from "@/components/cabinet/instance-tabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function InstancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentTenantUser();
  if (!user) redirect("/cabinet/login");

  const instance = await prisma.wAInstance.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!instance) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <Link
        href="/cabinet"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft size={14} /> Назад к списку
      </Link>

      <InstanceTabs id={instance.id} active="connect" />

      <InstanceCard
        initial={{
          id: instance.id,
          label: instance.label,
          phoneNumber: instance.phoneNumber,
          status: instance.status,
          webhookUrl: instance.webhookUrl,
        }}
      />
    </div>
  );
}
