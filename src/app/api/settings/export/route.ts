import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    const [subjects, sessions, revisions, todos, routines, syllabus] = await Promise.all([
      prisma.subject.findMany({ where: { userId: user.id, deletedAt: null } }),
      prisma.studySession.findMany({ where: { userId: user.id, deletedAt: null }, include: { laps: true } }),
      prisma.revisionTopic.findMany({ where: { userId: user.id, deletedAt: null } }),
      prisma.todo.findMany({ where: { userId: user.id, deletedAt: null } }),
      prisma.routine.findMany({ where: { userId: user.id, deletedAt: null } }),
      prisma.syllabusSubject.findMany({
        where: { userId: user.id, deletedAt: null },
        include: { columns: true, rows: { include: { cells: true } } },
      }),
    ]);

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      user: { email: user.email, name: user.name },
      subjects,
      studySessions: sessions,
      revisionTopics: revisions,
      todos,
      routines,
      syllabus,
    };

    if (format === "csv") {
      // Return simple CSV of study sessions
      let csv = "ID,Topic,Subject,StartAt,EndAt,DurationMinutes,Source\n";
      sessions.forEach((s) => {
        csv += `"${s.id}","${s.topic.replace(/"/g, '""')}","${s.subjectId || ""}","${s.startAt.toISOString()}","${s.endAt.toISOString()}",${Math.round(s.durationSeconds / 60)},"${s.source}"\n`;
      });
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="prepwise-study-sessions.csv"',
        },
      });
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="prepwise-backup.json"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to export data" } }, { status: 500 });
  }
}
