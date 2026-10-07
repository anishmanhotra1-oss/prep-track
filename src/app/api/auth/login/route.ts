import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signAccessToken, signRefreshToken, setAuthCookies } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const rate = checkRateLimit(`login_${ip}`, 10, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many login attempts. Please wait a minute." } },
        { status: 429 }
      );
    }

    const body = await req.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid email or password format", fields: result.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
        { status: 401 }
      );
    }

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
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to log in" } },
      { status: 500 }
    );
  }
}
