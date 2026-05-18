import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantUser, hashApiKey, type CurrentTenantUser } from "./tenant-auth";
import { prisma } from "./prisma";

type Authed = {
  tenantId: string;
  user?: CurrentTenantUser;
};

// Accepts either tenant_session cookie (web UI) or Authorization: Bearer <apiKey> (machine).
export async function authenticateApiRequest(req: NextRequest): Promise<Authed | null> {
  const user = await getCurrentTenantUser();
  if (user) return { tenantId: user.tenantId, user };

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const key = auth.slice(7).trim();
    const hash = hashApiKey(key);
    const tenant = await prisma.tenant.findUnique({ where: { apiKeyHash: hash } });
    if (tenant) return { tenantId: tenant.id };
  }
  return null;
}

export async function requireInstance(req: NextRequest, instanceId: string) {
  const authed = await authenticateApiRequest(req);
  if (!authed) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const instance = await prisma.wAInstance.findFirst({
    where: { id: instanceId, tenantId: authed.tenantId },
  });
  if (!instance) {
    return { error: NextResponse.json({ error: "Instance not found" }, { status: 404 }) };
  }
  return { authed, instance };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
