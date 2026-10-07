import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const weeks = parseInt(searchParams.get("weeks") || "12");

    // Fetch study sessions for past N weeks
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const [sessions, dayLogs] = await Promise.all([
      prisma.studySession.findMany({
        where: { userId: user.id, startAt: { gte: startDate }, deletedAt: null },
        select: { id: true, startAt: true, durationSeconds: true },
      }),
      prisma.dayLog.findMany({
        where: { userId: user.id },
      }),
    ]);

    // Aggregate total minutes per YYYY-MM-DD
    const dailyMap: Record<string, number> = {};
    sessions.forEach((s) => {
      const dateKey = s.startAt.toISOString().split("T")[0];
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + Math.round(s.durationSeconds / 60);
    });

    const dayLogMap: Record<string, { note?: string | null; isRestDay?: boolean }> = {};
    dayLogs.forEach((dl) => {
      dayLogMap[dl.date] = { note: dl.note, isRestDay: dl.isRestDay };
    });

    return NextResponse.json({ dailyMap, dayLogMap });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to fetch history aggregation" } }, { status: 500 });
  }
}
