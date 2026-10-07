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
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const routine = await prisma.routine.findFirst({
      where: { id, userId: user.id, deletedAt: null },
    });

    if (!routine) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Routine not found" } }, { status: 404 });
    }

    const existingCompletion = await prisma.routineCompletion.findUnique({
      where: { routineId_date: { routineId: id, date } },
    });

    if (existingCompletion) {
      await prisma.routineCompletion.delete({
        where: { id: existingCompletion.id },
      });
    } else {
      await prisma.routineCompletion.create({
        data: { routineId: id, date },
      });
    }

    notifyUserSync(user.id, { type: "ROUTINE_UPDATED", entity: "routines", id });
    return NextResponse.json({ success: true, isCompleted: !existingCompletion });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to toggle routine completion" } }, { status: 500 });
  }
}
