import { redirect } from "next/navigation";
import { getCurrentTenantUser } from "@/lib/tenant-auth";
import { NewInstanceForm } from "@/components/cabinet/new-instance-form";

export default async function NewInstancePage() {
  const user = await getCurrentTenantUser();
  if (!user) redirect("/cabinet/login");

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">Подключить WhatsApp</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Дайте номеру название и нажмите &laquo;Создать&raquo; — на следующем шаге появится QR-код
        для привязки.
      </p>
      <NewInstanceForm />
    </div>
  );
}
