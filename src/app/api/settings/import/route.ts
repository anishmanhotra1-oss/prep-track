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
        const cleanName = typeof subj?.name === "string" ? subj.name.trim().slice(0, 60) : "";
        if (cleanName) {
          await prisma.subject.create({
            data: {
              userId: user.id,
              name: cleanName,
              color: typeof subj.color === "string" ? subj.color.slice(0, 30) : "#3B82F6",
            },
          });
        }
      }
    }

    // Import study sessions
    if (Array.isArray(backup.studySessions)) {
      for (const sess of backup.studySessions) {
        const cleanTopic = typeof sess?.topic === "string" ? sess.topic.trim().slice(0, 120) : "";
        if (cleanTopic && sess.startAt && sess.endAt) {
          const rawTags = Array.isArray(sess.tags)
            ? sess.tags
            : typeof sess.tags === "string"
            ? [sess.tags]
            : [];
          await prisma.studySession.create({
            data: {
              userId: user.id,
              topic: cleanTopic,
              startAt: new Date(sess.startAt),
              endAt: new Date(sess.endAt),
              durationSeconds: sess.durationSeconds || 1800,
              tags: JSON.stringify(rawTags),
              note: typeof sess.note === "string" ? sess.note.slice(0, 1000) : null,
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
