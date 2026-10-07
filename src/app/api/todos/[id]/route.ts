import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const updateTodoSchema = z.object({
  title: z.string().min(1).optional(),
  plannedMinutes: z.number().nullable().optional(),
  bucket: z.enum(["today", "later"]).optional(),
  completed: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = updateTodoSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid fields" } }, { status: 400 });
    }

    const existing = await prisma.todo.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "To-do item not found" } }, { status: 404 });
    }

    let completedAt = existing.completedAt;
    if (result.data.completed !== undefined) {
      completedAt = result.data.completed ? new Date() : null;
    }

    const updated = await prisma.todo.update({
      where: { id },
      data: {
        ...(result.data.title && { title: result.data.title }),
        ...(result.data.plannedMinutes !== undefined && { plannedMinutes: result.data.plannedMinutes }),
        ...(result.data.bucket && { bucket: result.data.bucket }),
        completedAt,
      },
    });

    // If linked revision and marked completed, advance revision step as well
    if (result.data.completed && existing.linkedRevisionId) {
      const rev = await prisma.revisionTopic.findUnique({
        where: { id: existing.linkedRevisionId },
        include: { set: true },
      });
      if (rev) {
        let intervals = [1, 7, 30];
        try {
          if (rev.set?.intervals) intervals = JSON.parse(rev.set.intervals);
        } catch (e) {}

        const nextStep = rev.stepIndex + 1;
        const isMastered = nextStep >= intervals.length;
        const days = intervals[nextStep] || 1;
        const nextDueAt = isMastered
          ? rev.nextDueAt
          : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        await prisma.revisionTopic.update({
          where: { id: rev.id },
          data: {
            stepIndex: nextStep,
            nextDueAt,
            status: isMastered ? "mastered" : "active",
          },
        });
      }
    }

    // If linked routine and marked completed, record RoutineCompletion for today
    if (result.data.completed && existing.linkedRoutineId) {
      const todayStr = new Date().toISOString().split("T")[0];
      await prisma.routineCompletion.upsert({
        where: { routineId_date: { routineId: existing.linkedRoutineId, date: todayStr } },
        create: { routineId: existing.linkedRoutineId, date: todayStr },
        update: {},
      });
    }

    notifyUserSync(user.id, { type: "TODO_UPDATED", entity: "todos", id: updated.id });
    return NextResponse.json({ todo: updated });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to update to-do" } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.todo.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "To-do item not found" } }, { status: 404 });
    }

    await prisma.todo.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    notifyUserSync(user.id, { type: "TODO_DELETED", entity: "todos", id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to delete to-do" } }, { status: 500 });
  }
}
