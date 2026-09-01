import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;
const clientCacheKey = "krishiSetuPrismaClient20260901093000";

export const prisma =
  globalForPrisma[clientCacheKey] ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma[clientCacheKey] = prisma;
}
