import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUserSync } from "@/lib/sse";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const { subjectId } = body;

    const count = await prisma.syllabusRow.count({ where: { subjectId, deletedAt: null } });
    const row = await prisma.syllabusRow.create({
      data: {
        subjectId,
        order: count,
        done: false,
      },
    });

    notifyUserSync(user.id, { type: "SYLLABUS_UPDATED", entity: "syllabus", id: subjectId });
    return NextResponse.json({ row }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to add row" } }, { status: 500 });
  }
}
