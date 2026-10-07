import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyUserSync } from "@/lib/sse";

const snoozeSchema = z.object({
  days: z.number().positive(),
  action: z.enum(["snooze", "ignore"]).optional().default("snooze"),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({ days: 1 }));
    const result = snoozeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid snooze params" } }, { status: 400 });
    }

    const { days, action } = result.data;
    const topic = await prisma.revisionTopic.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!topic) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Revision topic not found" } }, { status: 404 });
    }

    let updateData: any = {};
    if (action === "ignore") {
      updateData.status = "ignored";
    } else {
      const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      updateData.snoozedUntil = snoozedUntil;
      updateData.nextDueAt = snoozedUntil;
      updateData.status = "active";
    }

    const updated = await prisma.revisionTopic.update({
      where: { id },
      data: updateData,
    });

    notifyUserSync(user.id, { type: "REVISION_UPDATED", entity: "revisions", id: updated.id });
    return NextResponse.json({ topic: updated });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to snooze revision" } }, { status: 500 });
  }
}
