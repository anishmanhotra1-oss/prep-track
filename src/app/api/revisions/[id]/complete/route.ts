import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUserSync } from "@/lib/sse";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const topic = await prisma.revisionTopic.findFirst({
      where: { id, userId: user.id, deletedAt: null },
      include: { set: true },
    });

    if (!topic) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Revision topic not found" } }, { status: 404 });
    }

    const now = new Date();

    await prisma.revisionCompletion.create({
      data: {
        topicId: topic.id,
        stepIndex: topic.stepIndex,
        completedAt: now,
      },
    });

    let intervals: number[] = [1, 7, 30];
    if (topic.set?.intervals) {
      if (typeof topic.set.intervals === "string") {
        try { intervals = JSON.parse(topic.set.intervals); } catch (e) {}
      } else if (Array.isArray(topic.set.intervals)) {
        intervals = topic.set.intervals as unknown as number[];
      }
    }

    const nextStepIndex = topic.stepIndex + 1;
    let updatedStatus = "active";
    let nextDueAt = topic.nextDueAt;

    if (nextStepIndex < intervals.length) {
      const nextDays = intervals[nextStepIndex];
      nextDueAt = new Date(now.getTime() + nextDays * 24 * 60 * 60 * 1000);
    } else {
      updatedStatus = "mastered";
    }

    const updated = await prisma.revisionTopic.update({
      where: { id: topic.id },
      data: {
        stepIndex: nextStepIndex,
        nextDueAt,
        status: updatedStatus,
      },
      include: { subject: true, set: true },
    });

    notifyUserSync(user.id, { type: "REVISION_COMPLETED", entity: "revisions", id: updated.id });
    return NextResponse.json({ topic: updated });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to complete revision step" } }, { status: 500 });
  }
}
