import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const updateSessionSchema = z.object({
  subjectId: z.string().nullable().optional(),
  topic: z.string().min(1).optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = updateSessionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid session fields" } }, { status: 400 });
    }

    const existing = await prisma.studySession.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }

    const startDate = result.data.startAt ? new Date(result.data.startAt) : existing.startAt;
    const endDate = result.data.endAt ? new Date(result.data.endAt) : existing.endAt;

    if (endDate <= startDate) {
      return NextResponse.json({ error: { code: "INVALID_TIME_RANGE", message: "End time must be after start time" } }, { status: 400 });
    }

    const durationSeconds = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));

    const updated = await prisma.studySession.update({
      where: { id },
      data: {
        ...(result.data.subjectId !== undefined && { subjectId: result.data.subjectId }),
        ...(result.data.topic && { topic: result.data.topic }),
        startAt: startDate,
        endAt: endDate,
        durationSeconds,
        ...(result.data.tags && { tags: JSON.stringify(result.data.tags) }),
        ...(result.data.note !== undefined && { note: result.data.note }),
      },
      include: { subject: true, laps: true },
    });

    notifyUserSync(user.id, { type: "STUDY_SESSION_UPDATED", entity: "study-sessions", id: updated.id });
    return NextResponse.json({ studySession: updated });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to update study session" } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.studySession.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    }

    await prisma.studySession.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    notifyUserSync(user.id, { type: "STUDY_SESSION_DELETED", entity: "study-sessions", id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to delete session" } }, { status: 500 });
  }
}
