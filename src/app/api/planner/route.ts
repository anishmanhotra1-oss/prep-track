import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const createBlockSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subjectId: z.string().nullable().optional(),
  startAt: z.string(),
  endAt: z.string(),
  recurrence: z.any().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");

    let whereClause: any = { userId: user.id, deletedAt: null };

    if (startStr && endStr) {
      whereClause.startAt = { lte: new Date(endStr) };
      whereClause.endAt = { gte: new Date(startStr) };
    }

    const blocks = await prisma.plannerBlock.findMany({
      where: whereClause,
      include: { subject: true },
      orderBy: { startAt: "asc" },
    });

    // Also fetch routines to render recurring routine blocks in planner
    const routines = await prisma.routine.findMany({
      where: { userId: user.id, pausedAt: null, deletedAt: null },
    });

    return NextResponse.json({ blocks, routines });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to fetch planner blocks" } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = createBlockSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid planner block data" } }, { status: 400 });
    }

    const { title, subjectId, startAt, endAt, recurrence } = result.data;
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (endDate <= startDate) {
      return NextResponse.json({ error: { code: "INVALID_RANGE", message: "End time must be after start time" } }, { status: 400 });
    }

    const block = await prisma.plannerBlock.create({
      data: {
        userId: user.id,
        title,
        subjectId: subjectId || null,
        startAt: startDate,
        endAt: endDate,
        recurrence: recurrence || null,
      },
      include: { subject: true },
    });

    notifyUserSync(user.id, { type: "PLANNER_UPDATED", entity: "planner", id: block.id });
    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to create planner block" } }, { status: 500 });
  }
}
