"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const handleLogout = async () => {
    await fetch("/api/cabinet/auth/logout", { method: "POST" });
    router.push("/cabinet/login");
    router.refresh();
  };
  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
    >
      <LogOut size={14} /> Выйти
    </button>
  );
}
