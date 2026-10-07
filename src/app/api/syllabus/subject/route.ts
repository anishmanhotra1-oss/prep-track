import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const subjectSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = subjectSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid title" } }, { status: 400 });
    }

    // Create syllabus subject
    const subject = await prisma.syllabusSubject.create({
      data: {
        userId: user.id,
        title: result.data.title,
      },
    });

    // Create default columns: Topic (text), Target Date (date), Source (text)
    const col1 = await prisma.syllabusColumn.create({
      data: { subjectId: subject.id, name: "Topic", type: "text", order: 0 },
    });
    const col2 = await prisma.syllabusColumn.create({
      data: { subjectId: subject.id, name: "Target Date", type: "date", order: 1 },
    });
    const col3 = await prisma.syllabusColumn.create({
      data: { subjectId: subject.id, name: "Source", type: "text", order: 2 },
    });

    // Create 2 initial sample rows
    for (let i = 0; i < 2; i++) {
      const row = await prisma.syllabusRow.create({
        data: { subjectId: subject.id, order: i, done: false },
      });
      await prisma.syllabusCell.createMany({
        data: [
          { rowId: row.id, columnId: col1.id, value: i === 0 ? "Sample Chapter 1" : "Sample Chapter 2" },
          { rowId: row.id, columnId: col2.id, value: new Date().toISOString().split("T")[0] },
          { rowId: row.id, columnId: col3.id, value: "Textbook Vol. 1" },
        ],
      });
    }

    notifyUserSync(user.id, { type: "SYLLABUS_UPDATED", entity: "syllabus", id: subject.id });
    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to create syllabus subject" } }, { status: 500 });
  }
}
