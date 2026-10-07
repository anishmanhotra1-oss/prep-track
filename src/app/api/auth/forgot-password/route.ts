import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid email" } },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
      console.log(`\n==========================================\n[DEV FORGOT PASSWORD LINK FOR ${user.email}]:\n${resetUrl}\n==========================================\n`);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a password reset link has been issued.",
    });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to process request" } }, { status: 500 });
  }
}
