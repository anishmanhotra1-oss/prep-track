import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const createRoutineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().default("#F97316"),
  frequencyType: z.enum(["interval", "specific_weekdays", "weekly"]).default("interval"),
  intervalDays: z.number().nullable().optional().default(1),
  weekdays: z.array(z.number()).optional().default([]),
  durationMinutes: z.number().default(30),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const routines = await prisma.routine.findMany({
      where: { userId: user.id, deletedAt: null },
      include: { completions: true },
      orderBy: { createdAt: "asc" },
    });

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const routinesWithStats = routines.map((r) => {
      const daysDone = r.completions.length;
      let parsedWeekdays: number[] = [];
      try {
        if (r.weekdays) parsedWeekdays = JSON.parse(r.weekdays);
      } catch (e) {}

      // Calculate total scheduled days since startDate
      const start = new Date(r.startDate);
      const diffTime = Math.max(0, now.getTime() - start.getTime());
      const daysSinceStart = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

      let daysScheduled = daysSinceStart;
      if (r.frequencyType === "interval" && r.intervalDays && r.intervalDays > 1) {
        daysScheduled = Math.ceil(daysSinceStart / r.intervalDays);
      } else if (r.frequencyType === "specific_weekdays" && parsedWeekdays.length > 0) {
        // Estimate based on selected weekdays proportion
        daysScheduled = Math.max(1, Math.round(daysSinceStart * (parsedWeekdays.length / 7)));
      }

      const completionPercentage = Math.min(100, Math.round((daysDone / Math.max(1, daysScheduled)) * 100));

      // Calculate streak
      let streak = 0;
      let checkDate = new Date();

      while (true) {
        const dateKey = checkDate.toISOString().split("T")[0];
        const isDone = r.completions.some((c) => c.date === dateKey);
        if (isDone) {
          streak += 1;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // If today is not done yet, don't break streak immediately if yesterday was done
          if (dateKey === todayStr) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
          break;
        }
      }

      const isCompletedToday = r.completions.some((c) => c.date === todayStr);

      return {
        id: r.id,
        name: r.name,
        color: r.color,
        frequencyType: r.frequencyType,
        intervalDays: r.intervalDays,
        weekdays: parsedWeekdays,
        durationMinutes: r.durationMinutes,
        pausedAt: r.pausedAt,
        daysDone,
        daysScheduled,
        completionPercentage,
        streak,
        isCompletedToday,
      };
    });

    return NextResponse.json({ routines: routinesWithStats });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to fetch routines" } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = createRoutineSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid routine fields" } }, { status: 400 });
    }

    const routine = await prisma.routine.create({
      data: {
        userId: user.id,
        name: result.data.name,
        color: result.data.color,
        frequencyType: result.data.frequencyType,
        intervalDays: result.data.intervalDays || 1,
        weekdays: JSON.stringify(result.data.weekdays || []),
        durationMinutes: result.data.durationMinutes,
      },
    });

    notifyUserSync(user.id, { type: "ROUTINE_CREATED", entity: "routines", id: routine.id });
    return NextResponse.json({ routine }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to create routine" } }, { status: 500 });
  }
}
