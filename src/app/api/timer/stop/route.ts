import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const stopModalSaveSchema = z.object({
  subjectId: z.string().nullable().optional(),
  topic: z.string().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = stopModalSaveSchema.safeParse(body);
    const saveOverrides = parsed.success ? parsed.data : {};

    const timer = await prisma.activeTimer.findUnique({ where: { userId: user.id } });
    if (!timer) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "No active timer" } }, { status: 400 });
    }

    let totalMs = timer.accumulatedMs;
    if (timer.status === "running" && timer.startedAt) {
      totalMs += Math.max(0, Date.now() - new Date(timer.startedAt).getTime());
    }

    const durationSeconds = Math.max(1, Math.floor(totalMs / 1000));
    const now = new Date();
    const endAt = saveOverrides.endAt ? new Date(saveOverrides.endAt) : now;
    const startAt = saveOverrides.startAt
      ? new Date(saveOverrides.startAt)
      : new Date(endAt.getTime() - totalMs);

    const subjectId = saveOverrides.subjectId !== undefined ? saveOverrides.subjectId : timer.subjectId;
    const topic = saveOverrides.topic || timer.topic || "General Focus";

    // Create Study Session record
    const studySession = await prisma.studySession.create({
      data: {
        userId: user.id,
        subjectId,
        topic,
        startAt,
        endAt,
        durationSeconds,
        tags: JSON.stringify(saveOverrides.tags || []),
        note: saveOverrides.note || null,
        source: "timer",
      },
      include: { subject: true },
    });

    // Save laps if any
    let timerLaps: any[] = [];
    try {
      if (timer.laps) timerLaps = JSON.parse(timer.laps);
    } catch (e) {}

    if (timerLaps.length > 0) {
      await prisma.lap.createMany({
        data: timerLaps.map((lap) => ({
          sessionId: studySession.id,
          index: lap.index,
          splitMs: lap.splitMs,
          totalMs: lap.totalMs,
        })),
      });
    }

    // Schedule revision if revise flag was checked
    if (timer.revise) {
      let defaultSet = await prisma.revisionSet.findFirst({
        where: { userId: user.id, isDefault: true },
      });

      if (!defaultSet) {
        defaultSet = await prisma.revisionSet.findFirst({
          where: { userId: user.id },
        });
      }

      if (defaultSet) {
        let firstInterval = 1;
        try {
          const parsedInts = JSON.parse(defaultSet.intervals || "[1]");
          if (Array.isArray(parsedInts) && parsedInts.length > 0) firstInterval = parsedInts[0];
        } catch (e) {}

        const nextDueAt = new Date(Date.now() + firstInterval * 24 * 60 * 60 * 1000);
        await prisma.revisionTopic.create({
          data: {
            userId: user.id,
            title: topic,
            subjectId,
            setId: defaultSet.id,
            stepIndex: 0,
            nextDueAt,
            sourceSessionId: studySession.id,
            status: "active",
          },
        });
      }
    }

    // Reset active timer to idle
    const updatedTimer = await prisma.activeTimer.update({
      where: { userId: user.id },
      data: {
        subjectId: null,
        topic: null,
        targetSeconds: null,
        startedAt: null,
        accumulatedMs: 0,
        pausedAt: null,
        revise: false,
        laps: "[]",
        status: "idle",
      },
    });

    notifyUserSync(user.id, { type: "STUDY_SESSION_CREATED", entity: "study-sessions", id: studySession.id });
    notifyUserSync(user.id, { type: "TIMER_UPDATED", entity: "timer", id: updatedTimer.id });

    return NextResponse.json({
      studySession,
      activeTimer: {
        id: updatedTimer.id,
        accumulatedMs: 0,
        revise: false,
        laps: [],
        status: "idle",
      },
    });
  } catch (error: any) {
    console.error("Stop Timer Error:", error);
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to stop timer and save session" } }, { status: 500 });
  }
}
