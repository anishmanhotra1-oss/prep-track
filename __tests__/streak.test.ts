/**
 * Streak Calculation Unit Tests
 */

export function calculateStreak(
  dailyMinutes: Record<string, number>,
  restDays: Set<string>,
  todayKey: string
): number {
  let currentStreak = 0;
  let checkDate = new Date(`${todayKey}T00:00:00.000Z`);

  const getKey = (d: Date) => d.toISOString().split("T")[0];

  // If today has 0 study mins and is not rest day, check if yesterday had activity
  const initialKey = getKey(checkDate);
  if (!dailyMinutes[initialKey] && !restDays.has(initialKey)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const key = getKey(checkDate);
    const mins = dailyMinutes[key] || 0;
    const isRest = restDays.has(key);

    if (mins > 0 || isRest) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return currentStreak;
}

// Test cases execution
export function runStreakTests() {
  console.log("Running Streak Unit Tests...");

  const today = "2026-10-06";

  // Test 1: Consecutive study days
  const daily1 = { "2026-10-06": 120, "2026-10-05": 60, "2026-10-04": 45 };
  const rest1 = new Set<string>();
  const res1 = calculateStreak(daily1, rest1, today);
  console.assert(res1 === 3, `Test 1 Failed: Expected 3, got ${res1}`);

  // Test 2: Study + Rest day preserving streak
  const daily2 = { "2026-10-06": 90, "2026-10-04": 60 };
  const rest2 = new Set<string>(["2026-10-05"]);
  const res2 = calculateStreak(daily2, rest2, today);
  console.assert(res2 === 3, `Test 2 Failed: Expected 3, got ${res2}`);

  // Test 3: Streak broken by 0-study non-rest day
  const daily3 = { "2026-10-06": 90, "2026-10-03": 60 };
  const rest3 = new Set<string>();
  const res3 = calculateStreak(daily3, rest3, today);
  console.assert(res3 === 1, `Test 3 Failed: Expected 1, got ${res3}`);

  console.log("All Streak Unit Tests Passed!");
}
