import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const subjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().default("#3B82F6"),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const subjects = await prisma.subject.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ subjects });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to fetch subjects" } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = subjectSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input" } }, { status: 400 });
    }

    const subject = await prisma.subject.create({
      data: {
        userId: user.id,
        name: result.data.name,
        color: result.data.color,
      },
    });

    notifyUserSync(user.id, { type: "SUBJECT_CREATED", entity: "subjects", id: subject.id });

    return NextResponse.json({ subject }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to create subject" } }, { status: 500 });
  }
}
