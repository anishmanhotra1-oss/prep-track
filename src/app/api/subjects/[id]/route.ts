import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const updateSubjectSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  archivedAt: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = updateSubjectSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input" } }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.subject.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Subject not found" } }, { status: 404 });
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        ...(result.data.name && { name: result.data.name }),
        ...(result.data.color && { color: result.data.color }),
        ...(result.data.archivedAt !== undefined && {
          archivedAt: result.data.archivedAt ? new Date(result.data.archivedAt) : null,
        }),
      },
    });

    notifyUserSync(user.id, { type: "SUBJECT_UPDATED", entity: "subjects", id: updated.id });
    return NextResponse.json({ subject: updated });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to update subject" } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.subject.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Subject not found" } }, { status: 404 });
    }

    // Soft delete subject
    await prisma.subject.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    notifyUserSync(user.id, { type: "SUBJECT_DELETED", entity: "subjects", id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to delete subject" } }, { status: 500 });
  }
}
