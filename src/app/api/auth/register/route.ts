import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, signAccessToken, signRefreshToken, setAuthCookies } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rate = checkRateLimit(`register_${ip}`, 10, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many registration attempts. Please try again later." } },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid fields", fields: result.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { name, email, password, timezone } = result.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" } },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        timezone: timezone || "UTC",
      },
    });

    // Seed default revision sets for user
    await prisma.revisionSet.createMany({
      data: [
        { userId: user.id, name: "Default", intervals: JSON.stringify([1, 7, 30]), isDefault: true },
        { userId: user.id, name: "Quick recall", intervals: JSON.stringify([1, 3, 7]), isDefault: false },
      ],
    });

    // Seed default subjects for user
    const defaultSubjects = [
      { name: "History", color: "#3B82F6" },
      { name: "Polity", color: "#10B981" },
      { name: "Geography", color: "#F97316" },
      { name: "Economy", color: "#8B5CF6" },
      { name: "Science", color: "#EC4899" },
      { name: "Ethics", color: "#14B8A6" },
    ];

    await prisma.subject.createMany({
      data: defaultSubjects.map((s) => ({ ...s, userId: user.id })),
    });

    // Create session
    const refreshToken = await signRefreshToken({ userId: user.id, email: user.email });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        deviceInfo: req.headers.get("user-agent") || "Unknown Device",
        ipAddress: ip,
      },
    });

    const accessToken = await signAccessToken({ userId: user.id, email: user.email, sessionId: session.id });
    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        dayStartHour: user.dayStartHour,
        dailyGoalMinutes: user.dailyGoalMinutes,
      },
    });
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to register user: " + error.message } },
      { status: 500 }
    );
  }
}
