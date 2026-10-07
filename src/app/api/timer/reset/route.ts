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
        laps: JSON.stringify([]),
        status: "idle",
      },
    });

    const payload = {
      activeTimer: {
        id: updatedTimer.id,
        accumulatedMs: 0,
        revise: false,
        laps: [],
        status: "idle" as const,
      },
    };

    notifyUserSync(user.id, { type: "TIMER_UPDATED", entity: "timer", id: updatedTimer.id, ...payload });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to reset timer" } }, { status: 500 });
  }
}
