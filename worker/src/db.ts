import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Worker uses pg over TCP (long-lived process). Next.js side uses adapter-neon (serverless).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
// sessionBlob (~0,3–0,8 МБ на номер) не выбирается нигде по умолчанию — только явным select
// в auth-state. Иначе любой findMany по WAInstance тянет мегабайты через Neon.
export const prisma = new PrismaClient({
  adapter,
  omit: { wAInstance: { sessionBlob: true } },
});
