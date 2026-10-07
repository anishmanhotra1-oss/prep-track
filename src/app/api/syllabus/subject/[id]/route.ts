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

    const existing = await prisma.syllabusSubject.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Syllabus subject not found" } }, { status: 404 });
    }

    const updated = await prisma.syllabusSubject.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
      },
    });

    notifyUserSync(user.id, { type: "SYLLABUS_UPDATED", entity: "syllabus", id });
    return NextResponse.json({ subject: updated });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to update syllabus subject" } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.syllabusSubject.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Syllabus subject not found" } }, { status: 404 });
    }

    await prisma.syllabusSubject.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    notifyUserSync(user.id, { type: "SYLLABUS_UPDATED", entity: "syllabus", id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to delete syllabus subject" } }, { status: 500 });
  }
}
