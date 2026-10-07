import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clearAuthCookies } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (refreshToken) {
      await prisma.session.updateMany({
        where: { refreshToken },
        data: { revokedAt: new Date() },
      });
    }

    await clearAuthCookies();
    return NextResponse.json({ success: true });
  } catch (error) {
    await clearAuthCookies();
    return NextResponse.json({ success: true });
  }
}
