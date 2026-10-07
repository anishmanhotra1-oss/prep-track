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

    const column = await prisma.syllabusColumn.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.type && { type: body.type }),
      },
    });

    notifyUserSync(user.id, { type: "SYLLABUS_UPDATED", entity: "syllabus", id: column.subjectId });
    return NextResponse.json({ column });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to update column" } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const col = await prisma.syllabusColumn.findUnique({ where: { id } });
    if (!col) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Column not found" } }, { status: 404 });

    await prisma.syllabusColumn.delete({ where: { id } });

    notifyUserSync(user.id, { type: "SYLLABUS_UPDATED", entity: "syllabus", id: col.subjectId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to delete column" } }, { status: 500 });
  }
}
