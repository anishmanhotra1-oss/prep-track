import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signAccessToken, signRefreshToken, setAuthCookies } from "@/lib/auth";
import {
  getClientIp,
  checkLimit,
  recordFailedAttempt,
  resetAttempts,
} from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipKey = `login_ip:${ip}`;

    // 1. Initial IP level lock check (5 failed attempts per 15 minutes)
    const ipLimit = await checkLimit(ipKey, 5, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Too many failed login attempts from this network. Please wait ${Math.ceil(
              ipLimit.resetInSeconds / 60
            )} minute(s).`,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": ipLimit.resetInSeconds.toString() },
        }
      );
    }

    const body = await req.json().catch(() => null);
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid email or password format",
            fields: result.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = `login_email:${normalizedEmail}`;

    // 2. Email level lock check (5 failed attempts per 15 minutes)
    const emailLimit = await checkLimit(emailKey, 5, 15 * 60 * 1000);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Account temporarily locked due to too many failed login attempts. Please wait ${Math.ceil(
              emailLimit.resetInSeconds / 60
            )} minute(s).`,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": emailLimit.resetInSeconds.toString() },
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Record failed attempt for both IP and Email
      const [ipAttempts, emailAttempts] = await Promise.all([
        recordFailedAttempt(ipKey, 15 * 60 * 1000),
        recordFailedAttempt(emailKey, 15 * 60 * 1000),
      ]);

      if (ipAttempts >= 5 || emailAttempts >= 5) {
        return NextResponse.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many failed login attempts. Please wait 15 minutes before trying again.",
            },
          },
          { status: 429, headers: { "Retry-After": "900" } }
        );
      }

      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      // Record failed attempt for both IP and Email
      const [ipAttempts, emailAttempts] = await Promise.all([
        recordFailedAttempt(ipKey, 15 * 60 * 1000),
        recordFailedAttempt(emailKey, 15 * 60 * 1000),
      ]);

      if (ipAttempts >= 5 || emailAttempts >= 5) {
        return NextResponse.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many failed login attempts. Please wait 15 minutes before trying again.",
            },
          },
          { status: 429, headers: { "Retry-After": "900" } }
        );
      }

      return NextResponse.json(
        { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    // 3. Login successful: reset failed attempt counters
    await Promise.all([resetAttempts(ipKey), resetAttempts(emailKey)]);

    const refreshToken = await signRefreshToken({ userId: user.id, email: user.email });
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year persistent session

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
