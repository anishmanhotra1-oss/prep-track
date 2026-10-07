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

    const timer = await prisma.activeTimer.findUnique({
      where: { userId: user.id },
      include: { subject: true },
    });
    if (!timer || timer.status === "idle") {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "No active timer" } }, { status: 400 });
    }

    let currentMs = timer.accumulatedMs;
    if (timer.status === "running" && timer.startedAt) {
      currentMs += Math.max(0, Date.now() - new Date(timer.startedAt).getTime());
    }

    let existingLaps: any[] = [];
    try {
      if (timer.laps) existingLaps = JSON.parse(timer.laps);
    } catch (e) {}

    const lastTotalMs = existingLaps.length > 0 ? existingLaps[existingLaps.length - 1].totalMs : 0;
    const splitMs = currentMs - lastTotalMs;

    const newLap = {
      index: existingLaps.length + 1,
      splitMs,
      totalMs: currentMs,
    };

    const updatedLaps = [...existingLaps, newLap];

    const updated = await prisma.activeTimer.update({
      where: { userId: user.id },
      data: { laps: JSON.stringify(updatedLaps) },
      include: { subject: true },
    });

    let parsedLaps: any[] = [];
    try {
      if (updated.laps) parsedLaps = JSON.parse(updated.laps);
    } catch (e) {}

    const payload = {
      activeTimer: {
        id: updated.id,
        subjectId: updated.subjectId,
        subjectName: updated.subject?.name,
        subjectColor: updated.subject?.color,
        topic: updated.topic,
        targetSeconds: updated.targetSeconds,
        startedAt: updated.startedAt?.toISOString() || null,
        accumulatedMs: updated.accumulatedMs,
        pausedAt: updated.pausedAt?.toISOString() || null,
        revise: updated.revise,
        laps: parsedLaps,
        status: updated.status,
      },
    };

    notifyUserSync(user.id, { type: "TIMER_UPDATED", entity: "timer", id: updated.id });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to record lap" } }, { status: 500 });
  }
}
