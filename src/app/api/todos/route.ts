import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const createTodoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  plannedMinutes: z.number().nullable().optional(),
  bucket: z.enum(["today", "later"]).default("today"),
  linkedRevisionId: z.string().nullable().optional(),
  linkedRoutineId: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Fetch user todos
    const todos = await prisma.todo.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    // Auto-inject due revisions for today if not already existing
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const dueRevisions = await prisma.revisionTopic.findMany({
      where: {
        userId: user.id,
        status: "active",
        nextDueAt: { lte: endOfToday },
        deletedAt: null,
      },
    });

    for (const rev of dueRevisions) {
      const existing = todos.find((t) => t.linkedRevisionId === rev.id);
      if (!existing) {
        const created = await prisma.todo.create({
          data: {
            userId: user.id,
            title: `🔁 Revise: ${rev.title}`,
            plannedMinutes: 30,
            bucket: "today",
            linkedRevisionId: rev.id,
            date: todayStr,
          },
        });
        todos.push(created);
      }
    }

    // Auto-inject routines scheduled for today
    const routines = await prisma.routine.findMany({
      where: { userId: user.id, pausedAt: null, deletedAt: null },
    });

    const currentWeekday = now.getDay(); // 0 = Sun
    for (const routine of routines) {
      let isScheduledToday = false;
      if (routine.frequencyType === "interval") {
        isScheduledToday = true;
      } else if (routine.frequencyType === "specific_weekdays" || routine.frequencyType === "weekly") {
        let parsedWeekdays: number[] = [];
        try {
          if (routine.weekdays) parsedWeekdays = JSON.parse(routine.weekdays);
        } catch (e) {}
        if (parsedWeekdays.includes(currentWeekday)) {
          isScheduledToday = true;
        }
      }

      if (isScheduledToday) {
        const existing = todos.find((t) => t.linkedRoutineId === routine.id && t.date === todayStr);
        if (!existing) {
          const created = await prisma.todo.create({
            data: {
              userId: user.id,
              title: `✨ Routine: ${routine.name}`,
              plannedMinutes: routine.durationMinutes,
              bucket: "today",
              linkedRoutineId: routine.id,
              date: todayStr,
            },
          });
          todos.push(created);
        }
      }
    }

    const todayTodos = todos.filter((t) => t.bucket === "today");
    const laterTodos = todos.filter((t) => t.bucket === "later");

    const totalPlannedMinutesToday = todayTodos.reduce((sum, t) => sum + (t.plannedMinutes || 0), 0);

    return NextResponse.json({
      todayTodos,
      laterTodos,
      totalPlannedMinutesToday,
    });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to fetch to-dos" } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = createTodoSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid to-do fields" } }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const todo = await prisma.todo.create({
      data: {
        userId: user.id,
        title: result.data.title,
        plannedMinutes: result.data.plannedMinutes || null,
        bucket: result.data.bucket,
        date: result.data.bucket === "today" ? todayStr : null,
      },
    });

    notifyUserSync(user.id, { type: "TODO_CREATED", entity: "todos", id: todo.id });
    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to create to-do" } }, { status: 500 });
  }
}
