import { runStreakTests } from "../__tests__/streak.test";
import { runRevisionTests } from "../__tests__/revision.test";
import { runRateLimitAndValidationTests } from "../__tests__/rate-limit-and-validation.test";

console.log("==========================================");
console.log("Prep Track Automated Verification Suite");
console.log("==========================================");

async function main() {
  try {
    runStreakTests();
    runRevisionTests();
    await runRateLimitAndValidationTests();
    console.log("\n✅ ALL UNIT, RATE LIMIT & LENGTH VALIDATION TESTS PASSED SUCCESSFULLY.");
  } catch (e: any) {
    console.error("❌ TEST FAILURE:", e.message);
    process.exit(1);
  }
}

main();
