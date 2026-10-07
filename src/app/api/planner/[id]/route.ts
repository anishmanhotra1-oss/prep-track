import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUserSync } from "@/lib/sse";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.plannerBlock.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Planner block not found" } }, { status: 404 });
    }

    const startAt = body.startAt ? new Date(body.startAt) : existing.startAt;
    const endAt = body.endAt ? new Date(body.endAt) : existing.endAt;

    const updated = await prisma.plannerBlock.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.subjectId !== undefined && { subjectId: body.subjectId }),
        startAt,
        endAt,
        ...(body.recurrence !== undefined && { recurrence: typeof body.recurrence === "string" ? body.recurrence : JSON.stringify(body.recurrence) }),
        ...(body.doneAt !== undefined && { doneAt: body.doneAt ? new Date(body.doneAt) : null }),
      },
      include: { subject: true },
    });

    // If doneAt is set and logStudySession is requested, auto-create StudySession
    if (body.doneAt && body.logStudySession) {
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
