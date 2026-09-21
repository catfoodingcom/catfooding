import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Prisma 7 requires a driver adapter even for SQLite — no more implicit
// connection via the schema's datasource url at runtime.
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Reuse the client across Next.js dev hot-reloads instead of opening a new
// SQLite connection on every module reload.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
