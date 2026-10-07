import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const updateRoutineSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  frequencyType: z.enum(["interval", "specific_weekdays", "weekly"]).optional(),
  intervalDays: z.number().nullable().optional(),
  weekdays: z.array(z.number()).optional(),
  durationMinutes: z.number().optional(),
  paused: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = updateRoutineSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid routine fields" } }, { status: 400 });
    }

    const existing = await prisma.routine.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Routine not found" } }, { status: 404 });
    }

    let pausedAt = existing.pausedAt;
    if (result.data.paused !== undefined) {
      pausedAt = result.data.paused ? new Date() : null;
    }

    const updated = await prisma.routine.update({
      where: { id },
      data: {
        ...(result.data.name && { name: result.data.name }),
        ...(result.data.color && { color: result.data.color }),
        ...(result.data.frequencyType && { frequencyType: result.data.frequencyType }),
        ...(result.data.intervalDays !== undefined && { intervalDays: result.data.intervalDays }),
        ...(result.data.weekdays && { weekdays: JSON.stringify(result.data.weekdays) }),
        ...(result.data.durationMinutes !== undefined && { durationMinutes: result.data.durationMinutes }),
        pausedAt,
      },
    });

    notifyUserSync(user.id, { type: "ROUTINE_UPDATED", entity: "routines", id: updated.id });
    return NextResponse.json({ routine: updated });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to update routine" } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.routine.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Routine not found" } }, { status: 404 });
    }

    await prisma.routine.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    notifyUserSync(user.id, { type: "ROUTINE_DELETED", entity: "routines", id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to delete routine" } }, { status: 500 });
  }
}
