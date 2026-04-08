import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page doesn't need auth check
  // The layout wraps all /dashboard/* pages
  // Auth check happens in the individual pages and API routes

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
