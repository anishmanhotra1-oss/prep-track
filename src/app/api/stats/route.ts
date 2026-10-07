import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDurationHuman } from "@/lib/utils";

/**
 * PrepWise Streak Calculation Rule:
 * A day qualifies for streak progression if either:
 * 1. Total study duration on that date is >= 1 minute (at least one study session completed), OR
 * 2. The user explicitly marked that date as a "Rest Day" (isRestDay === true in DayLog table).
 *
 * The streak counts backward day-by-day starting from Today (or Yesterday if today has not had a session yet).
 * The streak breaks on the first past day that has 0 study minutes and is NOT marked as a Rest Day.
 */
export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subjectRange = searchParams.get("subjectRange") || "all"; // 7d, 30d, all

    // Fetch user study sessions & day logs
    const [sessions, dayLogs, subjects] = await Promise.all([
      prisma.studySession.findMany({
        where: { userId: user.id, deletedAt: null },
        include: { subject: true },
        orderBy: { startAt: "asc" },
      }),
      prisma.dayLog.findMany({
        where: { userId: user.id },
      }),
      prisma.subject.findMany({
        where: { userId: user.id, deletedAt: null },
      }),
    ]);

    // Build daily totals & rest day lookup
    const dailyMinsMap: Record<string, number> = {};
    const subjectMinsMap: Record<string, { name: string; color: string; seconds: number }> = {};
    const subjectMinsFilteredMap: Record<string, { name: string; color: string; seconds: number }> = {};

    const now = new Date();
    const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const cutoff30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalStudySeconds = 0;
    let bestDayKey = "";
    let bestDayMins = 0;

    sessions.forEach((s) => {
      const dateKey = s.startAt.toISOString().split("T")[0];
      const mins = Math.round(s.durationSeconds / 60);
      dailyMinsMap[dateKey] = (dailyMinsMap[dateKey] || 0) + mins;
      totalStudySeconds += s.durationSeconds;

      if (dailyMinsMap[dateKey] > bestDayMins) {
        bestDayMins = dailyMinsMap[dateKey];
        bestDayKey = dateKey;
      }

      // Subject stats
      const subjId = s.subjectId || "general";
      const subjName = s.subject?.name || "General Study";
      const subjColor = s.subject?.color || "#3B82F6";

      if (!subjectMinsMap[subjId]) {
        subjectMinsMap[subjId] = { name: subjName, color: subjColor, seconds: 0 };
      }
      subjectMinsMap[subjId].seconds += s.durationSeconds;

      // Filtered subject stats
      let passFilter = true;
      if (subjectRange === "7d" && s.startAt < cutoff7d) passFilter = false;
      if (subjectRange === "30d" && s.startAt < cutoff30d) passFilter = false;

      if (passFilter) {
        if (!subjectMinsFilteredMap[subjId]) {
          subjectMinsFilteredMap[subjId] = { name: subjName, color: subjColor, seconds: 0 };
        }
        subjectMinsFilteredMap[subjId].seconds += s.durationSeconds;
      }
    });

    const restDaySet = new Set(dayLogs.filter((d) => d.isRestDay).map((d) => d.date));

    // Calculate Streak
    let currentStreak = 0;
    let checkDate = new Date();
    let todayKey = checkDate.toISOString().split("T")[0];

    // If today has no study & is not rest day, check yesterday to allow active streak
    if (!dailyMinsMap[todayKey] && !restDaySet.has(todayKey)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      const mins = dailyMinsMap[dateStr] || 0;
      const isRest = restDaySet.has(dateStr);

      if (mins > 0 || isRest) {
        currentStreak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Top Subject overall
    let topSubject = { name: "None", color: "#3B82F6", hours: 0 };
    Object.values(subjectMinsMap).forEach((subj) => {
      const hrs = Math.round((subj.seconds / 3600) * 10) / 10;
      if (hrs > topSubject.hours) {
        topSubject = { name: subj.name, color: subj.color, hours: hrs };
      }
    });

    // Last 7 days bar chart data
    const last7DaysLabels: string[] = [];
    const last7DaysHours: number[] = [];
    let thisWeekSeconds = 0;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const mins = dailyMinsMap[key] || 0;
      last7DaysLabels.push(dayName);
      last7DaysHours.push(Math.round((mins / 60) * 10) / 10);
      thisWeekSeconds += mins * 60;
    }

    // Last 30 days daily activity area chart data
    const last30DaysLabels: string[] = [];
    const last30DaysHours: number[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
      const mins = dailyMinsMap[key] || 0;
      last30DaysLabels.push(label);
      last30DaysHours.push(Math.round((mins / 60) * 10) / 10);
    }

    // Average session
    const avgSessionSeconds = sessions.length > 0 ? Math.round(totalStudySeconds / sessions.length) : 0;

    // Study vs Rest days count
    const totalDaysLogged = Object.keys(dailyMinsMap).length;
    const restDaysCount = restDaySet.size;

    return NextResponse.json({
      streak: currentStreak,
      bestDay: {
        date: bestDayKey
          ? new Date(`${bestDayKey}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "N/A",
        hours: Math.round((bestDayMins / 60) * 10) / 10,
      },
      topSubject,
      thisWeekHours: Math.round((thisWeekSeconds / 3600) * 10) / 10,
      avgSessionFormatted: formatDurationHuman(avgSessionSeconds),
      daysRatio: `${restDaysCount} rest / ${totalDaysLogged} study`,
      chartThisWeek: {
        labels: last7DaysLabels,
        data: last7DaysHours,
      },
      chartSubject: Object.values(subjectMinsFilteredMap).map((s) => ({
        name: s.name,
        color: s.color,
        hours: Math.round((s.seconds / 3600) * 10) / 10,
      })),
      chart30Days: {
        labels: last30DaysLabels,
        data: last30DaysHours,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to compute stats" } }, { status: 500 });
  }
}
