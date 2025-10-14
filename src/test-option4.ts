/**
 * Test script for Option 4: Context-Aware Hybrid Execution
 *
 * Tests that code is correctly routed to:
 * - Local execution for npm/git commands
 * - Sandbox execution for custom code
 */

import { executeCodeTool } from "./agent/tools/executeCode.js";
import * as dotenv from "dotenv";

dotenv.config();

async function runTests() {
  console.log("\n" + "=".repeat(70));
  console.log("Testing Option 4: Context-Aware Hybrid Execution");
  console.log("=".repeat(70) + "\n");

  const tests: Array<{
    name: string;
    code: string;
    language?: "python" | "javascript" | "bash" | "go" | "rust";
  }> = [
    {
      name: "NPM Command (should run locally)",
      code: "npm list",
      language: undefined,
    },
    {
      name: "Git Command (should run locally)",
      code: "git status",
      language: undefined,
    },
    {
      name: "Python Code (should run in sandbox)",
      code: 'print("Hello from Python sandbox!")',
      language: "python",
    },
    {
      name: "JavaScript Code (should run in sandbox)",
      code: 'console.log("Hello from JavaScript sandbox!")',
      language: "javascript",
    },
    {
      name: "Bash Code (should run in sandbox)",
      code: 'echo "Hello from Bash sandbox!"',
      language: "bash",
    },
    {
      name: "Python Math (should run in sandbox)",
      code: 'print(f"Fibonacci(10) = {sum([1,1,2,3,5,8,13,21,34,55]) - sum([1,1,2,3,5,8,13,21,34])}")',
      language: "python",
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(
      `Code: ${test.code.substring(0, 60)}${test.code.length > 60 ? "..." : ""}`
    );
    console.log("-".repeat(70));

    try {
      const result = await executeCodeTool.func({
        code: test.code,
        language: test.language,
      });

      console.log(result);

      // Check if routing was correct
      if (
        test.name.includes("should run locally") &&
        result.includes("⚡ Code Executed Locally")
      ) {
        console.log("✅ PASS: Correctly routed to local execution");
        passed++;
      } else if (
        test.name.includes("should run in sandbox") &&
        result.includes("🔒 Code Executed in Sandbox")
      ) {
        console.log("✅ PASS: Correctly routed to sandbox execution");
        passed++;
      } else {
        console.log("❌ FAIL: Incorrect routing");
        failed++;
      }
    } catch (error: any) {
      console.log("❌ FAIL: Execution error");
      console.log("Error:", error.message);
      failed++;
    }

    console.log();
  }

  console.log("\n" + "=".repeat(70));
  console.log("Test Summary");
  console.log("=".repeat(70));
  console.log(`Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
  console.log("=".repeat(70) + "\n");

  if (failed === 0) {
    console.log("🎉 All tests passed! Option 4 is working correctly!\n");
  } else {
    console.log("⚠️  Some tests failed. Review the output above.\n");
  }
}

runTests().catch(console.error);
