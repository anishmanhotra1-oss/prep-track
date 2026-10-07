import { NextResponse } from "next/server";
import { getAuthenticatedUser, verifyPassword, hashPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = changePasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", fields: result.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, dbUser.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: { code: "INVALID_CREDENTIALS", message: "Incorrect current password" } }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    // Revoke other active sessions
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to change password" } }, { status: 500 });
  }
}
