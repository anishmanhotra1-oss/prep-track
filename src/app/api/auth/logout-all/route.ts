import { NextResponse } from "next/server";
import { getAuthenticatedUser, clearAuthCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not logged in" } }, { status: 401 });
    }

    await prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await clearAuthCookies();
    return NextResponse.json({ success: true, message: "Logged out from all devices" });
  } catch (error) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to logout all devices" } }, { status: 500 });
  }
}
