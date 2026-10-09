import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "prepwise_super_secret_jwt_key_32bytes_min_length_123456"
);

const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "prepwise_super_secret_refresh_jwt_key_32bytes_123456"
);

export interface TokenPayload {
  userId: string;
  email: string;
  sessionId?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function signRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(JWT_REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return payload as unknown as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  
  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  cookieStore.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60, // 365 days (1 year)
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.set("access_token", "", { maxAge: 0, path: "/" });
  cookieStore.set("refresh_token", "", { maxAge: 0, path: "/" });
}

export async function getAuthenticatedUser(): Promise<{ id: string; email: string; name: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
      // Try refresh token if access token expired or missing
      const refreshToken = cookieStore.get("refresh_token")?.value;
      if (!refreshToken) return null;

      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (!refreshPayload) return null;

      // Check session in db
      const session = await prisma.session.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        return null;
      }

      // Automatically extend session expiration date on activity (Rolling Session)
      const extendedExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      try {
        await prisma.session.update({
          where: { id: session.id },
          data: { expiresAt: extendedExpiresAt },
        });
      } catch {
        // ignore DB update failure during read-only ops
      }

      // Re-issue access token and refresh cookies
      const newAccessToken = await signAccessToken({
        userId: session.user.id,
        email: session.user.email,
        sessionId: session.id,
      });

      try {
        await setAuthCookies(newAccessToken, refreshToken);
      } catch {
        // Safe to ignore when called within a read-only Server Component layout/page render
      }
      return { id: session.user.id, email: session.user.email, name: session.user.name };
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      // If access token failed validation, fall back to refresh token check
      const refreshToken = cookieStore.get("refresh_token")?.value;
      if (!refreshToken) return null;

      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (!refreshPayload) return null;

      const session = await prisma.session.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        return null;
      }

      const extendedExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      try {
        await prisma.session.update({
          where: { id: session.id },
          data: { expiresAt: extendedExpiresAt },
        });
      } catch {
        // ignore
      }

      const newAccessToken = await signAccessToken({
        userId: session.user.id,
        email: session.user.email,
        sessionId: session.id,
      });

      try {
        await setAuthCookies(newAccessToken, refreshToken);
      } catch {
        // Safe to ignore when called within a read-only Server Component
      }
      return { id: session.user.id, email: session.user.email, name: session.user.name };
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true },
    });

    return user;
  } catch (e) {
    return null;
  }
}
