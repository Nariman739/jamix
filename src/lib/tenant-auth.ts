import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SESSION_COOKIE = "tenant_session";
const SESSION_DURATION_DAYS = 30;
const BCRYPT_ROUNDS = 10;

export type CurrentTenantUser = {
  userId: string;
  email: string;
  name: string | null;
  role: "OWNER" | "MANAGER";
  tenantId: string;
  tenantName: string;
  tenantPlan: "FREE" | "PRO" | "BUSINESS";
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateApiKey(): { key: string; hint: string; hash: string } {
  const key = `jmx_${crypto.randomBytes(24).toString("hex")}`;
  const hint = key.slice(0, 12);
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, hint, hash };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function createTenantSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await prisma.tenantSession.create({
    data: { userId, token, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function deleteTenantSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.tenantSession.deleteMany({ where: { token } });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentTenantUser(): Promise<CurrentTenantUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const session = await prisma.tenantSession.findUnique({
    where: { token },
    include: { user: { include: { tenant: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.tenantSession.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    tenantId: session.user.tenantId,
    tenantName: session.user.tenant.name,
    tenantPlan: session.user.tenant.plan,
  };
}

export async function requireTenantUser(): Promise<CurrentTenantUser> {
  const user = await getCurrentTenantUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function signupTenant(args: {
  email: string;
  password: string;
  name?: string;
  tenantName: string;
}): Promise<CurrentTenantUser> {
  const existing = await prisma.tenantUser.findUnique({ where: { email: args.email } });
  if (existing) throw new Error("Email already registered");

  const passwordHash = await hashPassword(args.password);
  const { key, hint, hash } = generateApiKey();

  const tenant = await prisma.tenant.create({
    data: {
      name: args.tenantName,
      apiKeyHash: hash,
      apiKeyHint: hint,
      users: {
        create: {
          email: args.email,
          passwordHash,
          name: args.name,
          role: "OWNER",
        },
      },
    },
    include: { users: true },
  });

  const user = tenant.users[0];
  await createTenantSession(user.id);

  // Note: api key shown to user only once during signup — we store hash only
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantPlan: tenant.plan,
  };
}

export async function loginTenant(email: string, password: string): Promise<CurrentTenantUser> {
  const user = await prisma.tenantUser.findUnique({
    where: { email },
    include: { tenant: true },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Invalid credentials");
  }

  await createTenantSession(user.id);

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenant.name,
    tenantPlan: user.tenant.plan,
  };
}
