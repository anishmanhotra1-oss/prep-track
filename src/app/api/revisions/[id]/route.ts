import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  subjectId: z.string().nullable().optional(),
  setId: z.string().optional(),
  status: z.enum(["active", "ignored", "mastered"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid fields" } }, { status: 400 });
    }

    const topic = await prisma.revisionTopic.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!topic) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Revision topic not found" } }, { status: 404 });
    }

    const updated = await prisma.revisionTopic.update({
      where: { id },
      data: {
        ...(result.data.title && { title: result.data.title }),
        ...(result.data.subjectId !== undefined && { subjectId: result.data.subjectId }),
        ...(result.data.setId && { setId: result.data.setId }),
        ...(result.data.status && { status: result.data.status }),
      },
    });

    notifyUserSync(user.id, { type: "REVISION_UPDATED", entity: "revisions", id: updated.id });
    return NextResponse.json({ topic: updated });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to update revision" } }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const topic = await prisma.revisionTopic.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!topic) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Revision topic not found" } }, { status: 404 });
    }

    await prisma.revisionTopic.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    notifyUserSync(user.id, { type: "REVISION_DELETED", entity: "revisions", id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to delete revision" } }, { status: 500 });
  }
}
