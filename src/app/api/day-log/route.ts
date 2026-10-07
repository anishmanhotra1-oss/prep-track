import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const dayLogSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  note: z.string().nullable().optional(),
  isRestDay: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const dayLog = await prisma.dayLog.findUnique({
      where: { userId_date: { userId: user.id, date } },
    });

    return NextResponse.json({ dayLog });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to fetch day log" } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = dayLogSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid date format" } }, { status: 400 });
    }

    const { date, note, isRestDay } = result.data;

    const dayLog = await prisma.dayLog.upsert({
      where: { userId_date: { userId: user.id, date } },
      create: {
        userId: user.id,
        date,
        note: note || null,
        isRestDay: isRestDay ?? false,
      },
      update: {
        ...(note !== undefined && { note }),
        ...(isRestDay !== undefined && { isRestDay }),
      },
    });

    return NextResponse.json({ dayLog });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to update day log" } }, { status: 500 });
  }
}
