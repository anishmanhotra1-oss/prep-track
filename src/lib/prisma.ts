import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Always retain singleton instance in globalThis across all environments
// to prevent connection exhaustion in serverless environments (Vercel/Next.js)
globalForPrisma.prisma = prisma;

/**
 * Execute a database query with automatic retry for transient cold-start or pooler connection drops.
 */
export async function withDbRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 250
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await queryFn();
    } catch (error: any) {
      attempt++;
      const errorMessage = error?.message || "";
      const errorCode = error?.code || "";

      // Check if this error is a transient connection / cold start error
      const isTransientConnectionError =
        errorCode === "P1001" || // Can't reach database server
        errorCode === "P1002" || // Database server reached but timed out
        errorCode === "P1008" || // Operations timed out
        errorCode === "P1017" || // Server has closed the connection
        errorCode === "P2024" || // Connection pool timeout
        errorMessage.includes("connection pool") ||
        errorMessage.includes("Connection terminated") ||
        errorMessage.includes("ECONNRESET") ||
        errorMessage.includes("socket closed") ||
        errorMessage.includes("Can't reach database server");

      if (attempt <= maxRetries && isTransientConnectionError) {
        console.warn(
          `[Prisma] Transient connection failure (attempt ${attempt}/${maxRetries}): ${errorCode || errorMessage}. Retrying in ${baseDelayMs * attempt}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
        continue;
      }

      throw error;
    }
  }
}
