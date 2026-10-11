import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createColumnSchema = z.object({
  subjectId: z.string().min(1, "Subject ID is required"),
  name: z
    .string()
    .trim()
    .min(1, "Column name is required")
    .max(60, "Column name cannot exceed 60 characters"),
  type: z.enum(["text", "date"]).default("text"),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = createColumnSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid column fields" } },
        { status: 400 }
      );
    }

    const { subjectId, name, type } = result.data;

    const count = await prisma.syllabusColumn.count({ where: { subjectId } });
    const column = await prisma.syllabusColumn.create({
      data: {
        subjectId,
        name,
        type,
        order: count,
      },
    });

    notifyUserSync(user.id, { type: "SYLLABUS_UPDATED", entity: "syllabus", id: subjectId });
    return NextResponse.json({ column }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to add column" } }, { status: 500 });
  }
}
