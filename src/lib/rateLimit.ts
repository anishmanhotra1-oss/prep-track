const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ipOrKey: string, maxRequests: number = 10, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ipOrKey);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ipOrKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}
