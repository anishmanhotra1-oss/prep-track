import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, checkLimit, recordFailedAttempt } from "@/lib/rateLimit";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipKey = `forgot_ip:${ip}`;

    // Rate limit: max 5 requests per 15 mins per IP
    const ipLimit = await checkLimit(ipKey, 5, 15 * 60 * 1000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many password reset requests from this network. Please wait a few minutes.",
          },
        },
        { status: 429, headers: { "Retry-After": ipLimit.resetInSeconds.toString() } }
      );
    }

    const body = await req.json().catch(() => null);
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid email address format" } },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = `forgot_email:${normalizedEmail}`;

    // Rate limit: max 5 requests per 15 mins per email
    const emailLimit = await checkLimit(emailKey, 5, 15 * 60 * 1000);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many password reset requests for this email address. Please wait a few minutes.",
          },
        },
        { status: 429, headers: { "Retry-After": emailLimit.resetInSeconds.toString() } }
      );
    }

    // Record request attempt
    await Promise.all([
      recordFailedAttempt(ipKey, 15 * 60 * 1000),
      recordFailedAttempt(emailKey, 15 * 60 * 1000),
    ]);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Invalidate any existing unused reset tokens for this user
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      // Send real email via Resend
      await sendPasswordResetEmail(user.email, token);
    }

    // Always return safe generic success message without leaking token or reset link
    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, password reset instructions have been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to process password reset request" } },
      { status: 500 }
    );
  }
}
