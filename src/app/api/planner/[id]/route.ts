import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

export const dynamic = "force-dynamic";

const updatePlannerBlockSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(120, "Planner block title cannot exceed 120 characters")
    .optional(),
  subjectId: z.string().nullable().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  recurrence: z.any().optional(),
  doneAt: z.string().nullable().optional(),
  logStudySession: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = updatePlannerBlockSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid block data", fields: result.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const existing = await prisma.plannerBlock.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Planner block not found" } }, { status: 404 });
    }

    const startAt = result.data.startAt ? new Date(result.data.startAt) : existing.startAt;
    const endAt = result.data.endAt ? new Date(result.data.endAt) : existing.endAt;

    const updated = await prisma.plannerBlock.update({
      where: { id },
      data: {
        ...(result.data.title && { title: result.data.title }),
        ...(result.data.subjectId !== undefined && { subjectId: result.data.subjectId }),
        startAt,
        endAt,
        ...(result.data.recurrence !== undefined && {
          recurrence:
            typeof result.data.recurrence === "string"
              ? result.data.recurrence
              : JSON.stringify(result.data.recurrence),
        }),
        ...(result.data.doneAt !== undefined && {
          doneAt: result.data.doneAt ? new Date(result.data.doneAt) : null,
        }),
      },
      include: { subject: true },
    });

    // If doneAt is set and logStudySession is requested, auto-create StudySession
    if (result.data.doneAt && result.data.logStudySession) {
      const durationSeconds = Math.max(1, Math.floor((endAt.getTime() - startAt.getTime()) / 1000));
      await prisma.studySession.create({
        data: {
          userId: user.id,
          subjectId: updated.subjectId,
          topic: updated.title,
          startAt,
          endAt,
          durationSeconds,
          source: "planner",
        },
      });
      notifyUserSync(user.id, { type: "STUDY_SESSION_CREATED", entity: "study-sessions" });
      try {
        revalidatePath("/stats");
        revalidatePath("/history");
      } catch (e) {}
    }

    notifyUserSync(user.id, { type: "PLANNER_UPDATED", entity: "planner", id: updated.id });
    return NextResponse.json({ block: updated });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to update planner block" } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "series"; // this_day, series
    const dayDate = searchParams.get("date"); // YYYY-MM-DD for exception

    const existing = await prisma.plannerBlock.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Planner block not found" } }, { status: 404 });
    }

    if (mode === "this_day" && dayDate) {
      let exceptionsArr: string[] = [];
      try {
        if (existing.exceptions) exceptionsArr = JSON.parse(existing.exceptions);
      } catch (e) {}
      await prisma.plannerBlock.update({
        where: { id },
        data: { exceptions: JSON.stringify([...exceptionsArr, dayDate]) },
      });
    } else {
      await prisma.plannerBlock.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }

    notifyUserSync(user.id, { type: "PLANNER_UPDATED", entity: "planner", id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to delete planner block" } }, { status: 500 });
  }
}
