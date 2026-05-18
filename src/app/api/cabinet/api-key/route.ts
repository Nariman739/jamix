import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantUser, generateApiKey } from "@/lib/tenant-auth";

// POST regenerates the API key. The plain key is returned ONCE.
export async function POST() {
  const user = await getCurrentTenantUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key, hint, hash } = generateApiKey();
  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { apiKeyHash: hash, apiKeyHint: hint },
  });
  return NextResponse.json({ ok: true, apiKey: key, apiKeyHint: hint });
}
