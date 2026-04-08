import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/dashboard/login");

  return <DashboardClient />;
}
