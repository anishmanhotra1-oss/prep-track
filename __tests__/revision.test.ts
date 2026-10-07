/**
 * Revision Scheduling Unit Tests
 */

export function calculateNextRevisionDue(
  stepIndex: number,
  intervals: number[],
  completedAt: Date
): { nextDueAt: Date | null; isMastered: boolean } {
  const nextStep = stepIndex + 1;
  if (nextStep >= intervals.length) {
    return { nextDueAt: null, isMastered: true };
  }

  const days = intervals[nextStep];
  const nextDueAt = new Date(completedAt.getTime() + days * 24 * 60 * 60 * 1000);
  return { nextDueAt, isMastered: false };
}

export function runRevisionTests() {
  console.log("Running Revision Unit Tests...");

  const intervals = [1, 7, 30]; // Default 1 day -> 1 week -> 1 month
  const now = new Date("2026-10-06T10:00:00Z");

  // Step 0 completed (next is step 1 -> +7 days)
  const res0 = calculateNextRevisionDue(0, intervals, now);
  console.assert(!res0.isMastered, "Test 0 Failed: Should not be mastered");
  console.assert(
    res0.nextDueAt?.toISOString() === "2026-10-13T10:00:00.000Z",
    `Test 0 Failed: Expected Oct 13, got ${res0.nextDueAt?.toISOString()}`
  );

  // Step 2 completed (last step -> Mastered)
  const res2 = calculateNextRevisionDue(2, intervals, now);
  console.assert(res2.isMastered, "Test 2 Failed: Should be mastered");

  console.log("All Revision Unit Tests Passed!");
}
