import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const syllabusSubjects = await prisma.syllabusSubject.findMany({
      where: { userId: user.id, deletedAt: null },
      include: {
        columns: { orderBy: { order: "asc" } },
        rows: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          include: { cells: true },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ syllabusSubjects });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to fetch syllabus data" } }, { status: 500 });
  }
}
