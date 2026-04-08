import { deleteAdminSession } from "@/lib/auth";

export async function POST() {
  await deleteAdminSession();
  return Response.json({ ok: true });
}
