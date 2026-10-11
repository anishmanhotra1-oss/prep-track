import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma, withDbRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsedWeeks = parseInt(searchParams.get("weeks") || "12", 10);
    const weeks = isNaN(parsedWeeks) || parsedWeeks <= 0 ? 12 : Math.min(parsedWeeks, 52);

    // Fetch study sessions for past N weeks
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);
    startDate.setHours(0, 0, 0, 0);

    const [sessions, dayLogs] = await withDbRetry(() =>
      Promise.all([
        prisma.studySession.findMany({
          where: { userId: user.id, startAt: { gte: startDate }, deletedAt: null },
          select: { id: true, startAt: true, durationSeconds: true },
        }),
        prisma.dayLog.findMany({
          where: { userId: user.id },
        }),
      ])
    );

    // Aggregate total minutes per YYYY-MM-DD
    const dailyMap: Record<string, number> = {};
    (sessions || []).forEach((s) => {
      if (!s?.startAt) return;
      const d = new Date(s.startAt);
      if (isNaN(d.getTime())) return;
      const dateKey = d.toISOString().split("T")[0];
      const mins = Math.max(0, Math.round((s.durationSeconds || 0) / 60));
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + mins;
    });

    const dayLogMap: Record<string, { note?: string | null; isRestDay?: boolean }> = {};
    (dayLogs || []).forEach((dl) => {
      if (!dl?.date) return;
      dayLogMap[dl.date] = { note: dl.note || null, isRestDay: Boolean(dl.isRestDay) };
    });

    return NextResponse.json(
      { dailyMap, dayLogMap },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error: any) {
    console.error("History API error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to fetch history aggregation" } },
      { status: 500 }
    );
  }
}
