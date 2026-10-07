import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const startTimerSchema = z.object({
  subjectId: z.string().nullable().optional(),
  topic: z.string().nullable().optional(),
  targetSeconds: z.number().nullable().optional(),
  revise: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = startTimerSchema.safeParse(body);
    const data = parsed.success ? parsed.data : {};

    let timer = await prisma.activeTimer.findUnique({ where: { userId: user.id } });
    const now = new Date();

    if (!timer) {
      timer = await prisma.activeTimer.create({
        data: {
          userId: user.id,
          subjectId: data.subjectId || null,
          topic: data.topic || null,
          targetSeconds: data.targetSeconds || null,
          startedAt: now,
          accumulatedMs: 0,
          revise: data.revise ?? false,
          status: "running",
        },
      });
    } else {
      let accumulated = timer.accumulatedMs;
      // If timer was paused, keep accumulatedMs
      timer = await prisma.activeTimer.update({
        where: { userId: user.id },
        data: {
          ...(data.subjectId !== undefined && { subjectId: data.subjectId }),
          ...(data.topic !== undefined && { topic: data.topic }),
          ...(data.targetSeconds !== undefined && { targetSeconds: data.targetSeconds }),
          ...(data.revise !== undefined && { revise: data.revise }),
          startedAt: now,
          pausedAt: null,
          status: "running",
        },
      });
    }

    const subject = timer.subjectId
      ? await prisma.subject.findUnique({ where: { id: timer.subjectId } })
      : null;

    const payload = {
      activeTimer: {
        id: timer.id,
        subjectId: timer.subjectId,
        subjectName: subject?.name,
        subjectColor: subject?.color,
        topic: timer.topic,
        targetSeconds: timer.targetSeconds,
        startedAt: timer.startedAt?.toISOString() || null,
        accumulatedMs: timer.accumulatedMs,
        pausedAt: null,
        revise: timer.revise,
        laps: timer.laps || [],
        status: timer.status as "running",
      },
    };

    notifyUserSync(user.id, { type: "TIMER_UPDATED", entity: "timer", id: timer.id, ...payload });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to start timer" } }, { status: 500 });
  }
}
