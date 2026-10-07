import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    let activeTimer = await prisma.activeTimer.findUnique({
      where: { userId: user.id },
      include: { subject: true },
    });

    if (!activeTimer) {
      activeTimer = await prisma.activeTimer.create({
        data: {
          userId: user.id,
          accumulatedMs: 0,
          status: "idle",
        },
        include: { subject: true },
      });
    }

    return NextResponse.json({
      activeTimer: {
        id: activeTimer.id,
        subjectId: activeTimer.subjectId,
        subjectName: activeTimer.subject?.name,
        subjectColor: activeTimer.subject?.color,
        topic: activeTimer.topic,
        targetSeconds: activeTimer.targetSeconds,
        startedAt: activeTimer.startedAt?.toISOString() || null,
        accumulatedMs: activeTimer.accumulatedMs,
        pausedAt: activeTimer.pausedAt?.toISOString() || null,
        revise: activeTimer.revise,
        laps: activeTimer.laps || [],
        status: activeTimer.status,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to fetch active timer" } }, { status: 500 });
  }
}
