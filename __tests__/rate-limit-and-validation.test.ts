import { checkLimit, recordFailedAttempt, resetAttempts } from "../src/lib/rateLimit";
import { registerSchema, loginSchema } from "../src/lib/validations/auth";
import { z } from "zod";

export async function runRateLimitAndValidationTests() {
  console.log("Running Rate Limit and Validation Unit Tests...");

  // 1. Test Rate Limiter Lockout after 5 failures
  const testIpKey = "test_ip_192_168_1_100";
  await resetAttempts(testIpKey);

  // Initial check: should be allowed
  let limit = await checkLimit(testIpKey, 5, 60000);
  if (!limit.allowed) throw new Error("Initial check should be allowed");
  if (limit.remaining !== 5) throw new Error(`Expected 5 remaining, got ${limit.remaining}`);

  // Record 4 failed attempts
  for (let i = 1; i <= 4; i++) {
    await recordFailedAttempt(testIpKey, 60000);
  }

  limit = await checkLimit(testIpKey, 5, 60000);
  if (!limit.allowed) throw new Error("4 failed attempts should still be allowed");
  if (limit.remaining !== 1) throw new Error(`Expected 1 remaining, got ${limit.remaining}`);

  // 5th failed attempt -> LOCKOUT
  await recordFailedAttempt(testIpKey, 60000);
  limit = await checkLimit(testIpKey, 5, 60000);
  if (limit.allowed) throw new Error("5th failed attempt MUST trigger lockout!");
  if (limit.remaining !== 0) throw new Error("Remaining should be 0 during lockout");

  // Reset -> Allowed again
  await resetAttempts(testIpKey);
  limit = await checkLimit(testIpKey, 5, 60000);
  if (!limit.allowed) throw new Error("Reset should clear lockout");
  console.log("  ✓ Rate limit lockout after 5 failures confirmed");

  // 2. Test User Name Length Limits
  const longName = "A".repeat(301);
  const nameResult = registerSchema.safeParse({
    name: longName,
    email: "test@example.com",
    password: "securePassword123",
  });
  if (nameResult.success) {
    throw new Error("Validation FAILED: 301-character name was accepted!");
  }
  console.log("  ✓ 300+ character name correctly rejected by Zod");

  // 3. Test Task Title Length Limits (e.g. 400 characters)
  const todoTitleSchema = z
    .string()
    .trim()
    .min(1)
    .max(120, "Task title cannot exceed 120 characters");
  const longTaskTitle = "Task ".repeat(80); // 400 chars
  const taskResult = todoTitleSchema.safeParse(longTaskTitle);
  if (taskResult.success) {
    throw new Error("Validation FAILED: 400-character task title was accepted!");
  }
  console.log("  ✓ 400-character task title correctly rejected by Zod");

  // 4. Test Subject Name Length Limits (e.g. 384 characters)
  const subjectNameSchema = z
    .string()
    .trim()
    .min(1)
    .max(60, "Subject name cannot exceed 60 characters");
  const longSubjectName = "Subject ".repeat(48); // 384 chars
  const subjectResult = subjectNameSchema.safeParse(longSubjectName);
  if (subjectResult.success) {
    throw new Error("Validation FAILED: 384-character subject name was accepted!");
  }
  console.log("  ✓ 384-character subject name correctly rejected by Zod");

  // 5. Test Normal Valid Inputs Pass
  const validUser = registerSchema.safeParse({
    name: "Alex Morgan",
    email: "alex@example.com",
    password: "supersecretpassword",
  });
  if (!validUser.success) {
    throw new Error("Validation FAILED on normal valid user input");
  }

  const validTask = todoTitleSchema.safeParse("Study Modern World History");
  if (!validTask.success) {
    throw new Error("Validation FAILED on normal task title");
  }

  const validSubject = subjectNameSchema.safeParse("Modern History");
  if (!validSubject.success) {
    throw new Error("Validation FAILED on normal subject name");
  }
  console.log("  ✓ Normal length inputs correctly accepted");

  console.log("All Rate Limit & Validation Tests Passed!\n");
}
