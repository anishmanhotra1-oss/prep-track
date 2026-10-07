import { runStreakTests } from "../__tests__/streak.test";
import { runRevisionTests } from "../__tests__/revision.test";

console.log("==========================================");
console.log("PrepWise Automated Verification Suite");
console.log("==========================================");

try {
  runStreakTests();
  runRevisionTests();
  console.log("\n✅ ALL UNIT & REVISION ENGINE TESTS PASSED SUCCESSFULLY.");
} catch (e: any) {
  console.error("❌ TEST FAILURE:", e.message);
  process.exit(1);
}
