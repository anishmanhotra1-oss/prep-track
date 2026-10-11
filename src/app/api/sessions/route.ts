import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

export const dynamic = "force-dynamic";

const createSessionSchema = z.object({
  subjectId: z.string().nullable().optional(),
  topic: z.string().trim().min(1, "Topic is required").max(120, "Topic cannot exceed 120 characters"),
  startAt: z.string(),
  endAt: z.string(),
  tags: z.array(z.string().max(30)).max(20).optional(),
  note: z.string().max(1000, "Notes cannot exceed 1000 characters").nullable().optional(),
  source: z.string().optional().default("manual"),
});

function parseSessionTags(session: any) {
  let tags: string[] = [];
  if (Array.isArray(session.tags)) {
    tags = session.tags;
  } else if (typeof session.tags === "string") {
    try {
      const parsed = JSON.parse(session.tags);
      tags = Array.isArray(parsed) ? parsed : (session.tags.trim() ? [session.tags.trim()] : []);
    } catch {
      tags = session.tags.trim() ? [session.tags.trim()] : [];
    }
  }
  return { ...session, tags };
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range"); // today, date, 12weeks, 30days
    const dateStr = searchParams.get("date"); // YYYY-MM-DD

    let whereClause: any = { userId: user.id, deletedAt: null };

    if (range === "today" || dateStr) {
      const targetDate = dateStr || new Date().toISOString().split("T")[0];
      const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);
      whereClause.startAt = { gte: startOfDay, lte: endOfDay };
    }

    const sessions = await prisma.studySession.findMany({
      where: whereClause,
      include: { subject: true, laps: { orderBy: { index: "asc" } } },
      orderBy: { startAt: "desc" },
    });

    const totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);

    return NextResponse.json({
      sessions: sessions.map(parseSessionTags),
      totalSeconds,
    });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to fetch study sessions" } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = createSessionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid session fields", fields: result.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { subjectId, topic, startAt, endAt, tags, note, source } = result.data;
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: { code: "INVALID_TIME_RANGE", message: "End time must be after start time" } },
        { status: 400 }
      );
    }

    const durationSeconds = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / 1000));

    const studySession = await prisma.studySession.create({
      data: {
        userId: user.id,
        subjectId: subjectId || null,
        topic,
        startAt: startDate,
        endAt: endDate,
        durationSeconds,
        tags: JSON.stringify(tags || []),
        note: note || null,
        source: source || "manual",
      },
      include: { subject: true, laps: true },
    });

    notifyUserSync(user.id, { type: "STUDY_SESSION_CREATED", entity: "study-sessions", id: studySession.id });
    try {
      revalidatePath("/stats");
      revalidatePath("/history");
      revalidatePath("/stopwatch");
    } catch (e) {}

    return NextResponse.json({ studySession: parseSessionTags(studySession) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to create study session" } }, { status: 500 });
  }
}
