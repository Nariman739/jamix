import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.env.ADMIN_USERNAME || "nariman";
  const password = process.env.ADMIN_PASSWORD || "jamix2026";

  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin user "${username}" already exists.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.create({
    data: { username, passwordHash },
  });

  console.log(`Admin user "${username}" created successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
