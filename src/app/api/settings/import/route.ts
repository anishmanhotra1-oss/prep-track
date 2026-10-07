import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const backup = await req.json();
    if (!backup || !backup.version) {
      return NextResponse.json({ error: { code: "INVALID_FORMAT", message: "Invalid PrepWise backup JSON file" } }, { status: 400 });
    }

    // Import subjects if provided
    if (Array.isArray(backup.subjects)) {
      for (const subj of backup.subjects) {
        if (subj.name) {
          await prisma.subject.create({
            data: {
              userId: user.id,
              name: subj.name,
              color: subj.color || "#3B82F6",
            },
          });
        }
      }
    }

    // Import study sessions
    if (Array.isArray(backup.studySessions)) {
      for (const sess of backup.studySessions) {
        if (sess.topic && sess.startAt && sess.endAt) {
          await prisma.studySession.create({
            data: {
              userId: user.id,
              topic: sess.topic,
              startAt: new Date(sess.startAt),
              endAt: new Date(sess.endAt),
              durationSeconds: sess.durationSeconds || 1800,
              tags: sess.tags || [],
              note: sess.note || null,
              source: sess.source || "manual",
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: "Backup data imported successfully" });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to import backup data" } }, { status: 500 });
  }
}
