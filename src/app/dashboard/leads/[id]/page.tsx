import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LeadDetailClient } from "@/components/dashboard/lead-detail-client";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/dashboard/login");

  const { id } = await params;
  return <LeadDetailClient leadId={id} />;
}
