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
    const { subjectId, name, type } = body;

    const count = await prisma.syllabusColumn.count({ where: { subjectId } });
    const column = await prisma.syllabusColumn.create({
      data: {
        subjectId,
        name: name || "New Column",
        type: type || "text",
        order: count,
      },
    });

    notifyUserSync(user.id, { type: "SYLLABUS_UPDATED", entity: "syllabus", id: subjectId });
    return NextResponse.json({ column }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to add column" } }, { status: 500 });
  }
}
