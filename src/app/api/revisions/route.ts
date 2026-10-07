import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const createRevisionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subjectId: z.string().nullable().optional(),
  setId: z.string().min(1, "Revision set is required"),
  nextDueAt: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "active"; // active, ignored, mastered, all
    const subjectIdFilter = searchParams.get("subjectId");
    const search = searchParams.get("search");

    let whereClause: any = { userId: user.id, deletedAt: null };

    if (statusFilter !== "all") {
      whereClause.status = statusFilter;
    }
    if (subjectIdFilter) {
      whereClause.subjectId = subjectIdFilter;
    }
    if (search) {
      whereClause.title = { contains: search, mode: "insensitive" };
    }

    const rawTopics = await prisma.revisionTopic.findMany({
      where: whereClause,
      include: {
        subject: true,
        set: true,
        completions: { orderBy: { stepIndex: "asc" } },
      },
      orderBy: { nextDueAt: "asc" },
    });

    const topics = rawTopics.map((t: any) => {
      let parsedIntervals: number[] = [1, 7, 30];
      if (t.set?.intervals) {
        if (typeof t.set.intervals === "string") {
          try {
            parsedIntervals = JSON.parse(t.set.intervals);
          } catch (e) {}
        } else if (Array.isArray(t.set.intervals)) {
          parsedIntervals = t.set.intervals as unknown as number[];
        }
      }
      return {
        ...t,
        set: t.set ? { ...t.set, intervals: parsedIntervals } : null,
      };
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const dueTodayCount = topics.filter((t: any) => t.status === "active" && t.nextDueAt <= endOfToday).length;
    const overdueCount = topics.filter((t: any) => t.status === "active" && t.nextDueAt < startOfToday).length;
    const next7DaysCount = topics.filter((t: any) => t.status === "active" && t.nextDueAt > endOfToday && t.nextDueAt <= next7Days).length;

    const doneThisMonthCount = await prisma.revisionCompletion.count({
      where: {
        topic: { userId: user.id },
        completedAt: { gte: startOfMonth },
      },
    });

    return NextResponse.json({
      topics,
      stats: {
        topicsTracked: topics.length,
        dueTodayCount,
        overdueCount,
        next7DaysCount,
        doneThisMonthCount,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to fetch revisions" } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = createRevisionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid revision fields" } }, { status: 400 });
    }

    const { title, subjectId, setId, nextDueAt } = result.data;

    const setObj = await prisma.revisionSet.findFirst({
      where: { id: setId, userId: user.id },
    });
    if (!setObj) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Revision set not found" } }, { status: 404 });
    }

    let parsedIntervals = [1, 7, 30];
    if (typeof setObj.intervals === "string") {
      try {
        parsedIntervals = JSON.parse(setObj.intervals);
      } catch (e) {}
    }

    const due = nextDueAt ? new Date(nextDueAt) : new Date(Date.now() + (parsedIntervals[0] || 1) * 24 * 60 * 60 * 1000);

    const topic = await prisma.revisionTopic.create({
      data: {
        userId: user.id,
        title,
        subjectId: subjectId || null,
        setId: setObj.id,
        stepIndex: 0,
        nextDueAt: due,
        status: "active",
      },
      include: { subject: true, set: true },
    });

    notifyUserSync(user.id, { type: "REVISION_CREATED", entity: "revisions", id: topic.id });
    return NextResponse.json({ topic }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to create revision topic" } }, { status: 500 });
  }
}
