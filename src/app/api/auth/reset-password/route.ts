import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", fields: result.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { token, newPassword } = result.data;
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: { code: "INVALID_TOKEN", message: "Reset token is invalid or expired" } }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: newHash },
    });

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Password reset successful. You can now log in." });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to reset password" } }, { status: 500 });
  }
}
