import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["delete", "snooze", "ignore", "restore", "set_subject"]),
  subjectId: z.string().nullable().optional(),
  snoozeDays: z.number().optional().default(1),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = bulkSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid bulk action request" } }, { status: 400 });
    }

    const { ids, action, subjectId, snoozeDays } = result.data;

    if (action === "delete") {
      await prisma.revisionTopic.updateMany({
        where: { id: { in: ids }, userId: user.id },
        data: { deletedAt: new Date() },
      });
    } else if (action === "ignore") {
      await prisma.revisionTopic.updateMany({
        where: { id: { in: ids }, userId: user.id },
        data: { status: "ignored" },
      });
    } else if (action === "restore") {
      await prisma.revisionTopic.updateMany({
        where: { id: { in: ids }, userId: user.id },
        data: { status: "active" },
      });
    } else if (action === "snooze") {
      const nextDueAt = new Date(Date.now() + snoozeDays * 24 * 60 * 60 * 1000);
      await prisma.revisionTopic.updateMany({
        where: { id: { in: ids }, userId: user.id },
        data: { nextDueAt, status: "active" },
      });
    } else if (action === "set_subject") {
      await prisma.revisionTopic.updateMany({
        where: { id: { in: ids }, userId: user.id },
        data: { subjectId: subjectId || null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to process bulk revision action" } }, { status: 500 });
  }
}
