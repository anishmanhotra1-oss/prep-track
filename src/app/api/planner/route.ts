import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma, withDbRetry } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

export const dynamic = "force-dynamic";

const createBlockSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Planner block title cannot exceed 120 characters"),
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
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        // Include the full day until 23:59:59.999Z
        endDate.setUTCHours(23, 59, 59, 999);
        whereClause.startAt = { lte: endDate };
        whereClause.endAt = { gte: startDate };
      }
    }

    const [blocks, routines] = await withDbRetry(() =>
      Promise.all([
        prisma.plannerBlock.findMany({
          where: whereClause,
          include: { subject: true },
          orderBy: { startAt: "asc" },
        }),
        prisma.routine.findMany({
          where: { userId: user.id, pausedAt: null, deletedAt: null },
        }),
      ])
    );

    return NextResponse.json(
      { blocks: blocks || [], routines: routines || [] },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Planner GET error:", error);
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
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid planner block data", fields: result.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { title, subjectId, startAt, endAt, recurrence } = result.data;
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: { code: "INVALID_DATE", message: "Invalid date format" } }, { status: 400 });
    }

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
        recurrence: recurrence ? (typeof recurrence === "string" ? recurrence : JSON.stringify(recurrence)) : null,
      },
      include: { subject: true },
    });

    notifyUserSync(user.id, { type: "PLANNER_UPDATED", entity: "planner", id: block.id });
    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    console.error("Planner POST error:", error);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to create planner block" } }, { status: 500 });
  }
}
