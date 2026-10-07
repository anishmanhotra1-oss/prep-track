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

    const row = await prisma.syllabusRow.update({
      where: { id },
      data: {
        ...(body.done !== undefined && { done: body.done }),
      },
    });

    notifyUserSync(user.id, { type: "SYLLABUS_UPDATED", entity: "syllabus", id: row.subjectId });
    return NextResponse.json({ row });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to update row" } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const row = await prisma.syllabusRow.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Row not found" } }, { status: 404 });

    await prisma.syllabusRow.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    notifyUserSync(user.id, { type: "SYLLABUS_UPDATED", entity: "syllabus", id: row.subjectId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to delete row" } }, { status: 500 });
  }
}
