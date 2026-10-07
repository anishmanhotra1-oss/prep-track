import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUserSync } from "@/lib/sse";

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const timer = await prisma.activeTimer.findUnique({ where: { userId: user.id } });
    if (!timer || timer.status !== "running" || !timer.startedAt) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Timer is not currently running" } }, { status: 400 });
    }

    const now = new Date();
    const elapsedSinceStart = now.getTime() - new Date(timer.startedAt).getTime();
    const newAccumulated = timer.accumulatedMs + Math.max(0, elapsedSinceStart);

    const updated = await prisma.activeTimer.update({
      where: { userId: user.id },
      data: {
        accumulatedMs: newAccumulated,
        startedAt: null,
        pausedAt: now,
        status: "paused",
      },
      include: { subject: true },
    });

    const payload = {
      activeTimer: {
        id: updated.id,
        subjectId: updated.subjectId,
        subjectName: updated.subject?.name,
        subjectColor: updated.subject?.color,
        topic: updated.topic,
        targetSeconds: updated.targetSeconds,
        startedAt: null,
        accumulatedMs: updated.accumulatedMs,
        pausedAt: updated.pausedAt?.toISOString() || null,
        revise: updated.revise,
        laps: updated.laps || [],
        status: updated.status as "paused",
      },
    };

    notifyUserSync(user.id, { type: "TIMER_UPDATED", entity: "timer", id: updated.id, ...payload });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to pause timer" } }, { status: 500 });
  }
}
