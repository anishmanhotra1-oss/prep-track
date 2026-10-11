import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(70, "Name cannot exceed 70 characters")
    .optional(),
  timezone: z.string().max(60).optional(),
  dayStartHour: z.number().min(0).max(23).optional(),
  dailyGoalMinutes: z.number().min(1).max(1440).optional(),
  weekStart: z.string().max(20).optional(),
  prefs: z.record(z.any()).optional(),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        dayStartHour: true,
        dailyGoalMinutes: true,
        weekStart: true,
        prefs: true,
      },
    });

    const sessions = await prisma.session.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, deviceInfo: true, ipAddress: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ profile, sessions });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to fetch settings" } }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = settingsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid settings format" } }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(result.data.name && { name: result.data.name }),
        ...(result.data.timezone && { timezone: result.data.timezone }),
        ...(result.data.dayStartHour !== undefined && { dayStartHour: result.data.dayStartHour }),
        ...(result.data.dailyGoalMinutes !== undefined && { dailyGoalMinutes: result.data.dailyGoalMinutes }),
        ...(result.data.weekStart && { weekStart: result.data.weekStart }),
        ...(result.data.prefs && { prefs: result.data.prefs }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        dayStartHour: true,
        dailyGoalMinutes: true,
        weekStart: true,
        prefs: true,
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to update settings" } }, { status: 500 });
  }
}
