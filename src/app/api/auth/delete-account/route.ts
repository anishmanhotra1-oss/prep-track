import { NextResponse } from "next/server";
import { getAuthenticatedUser, clearAuthCookies } from "@/lib/auth";
import { deleteAccountSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    const body = await req.json();
    const result = deleteAccountSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Please type DELETE to confirm account deletion" } },
        { status: 400 }
      );
    }

    // Cascade delete user data
    await prisma.user.delete({
      where: { id: user.id },
    });

    await clearAuthCookies();
    return NextResponse.json({ success: true, message: "Account deleted permanently" });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to delete account" } }, { status: 500 });
  }
}
