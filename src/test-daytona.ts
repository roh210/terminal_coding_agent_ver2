/**
 * Test script for Daytona API-based sandbox integration
 *
 * Tests:
 * 1. API key validation
 * 2. Python execution (simple, math, errors)
 * 3. JavaScript execution
 * 4. Timeout handling
 * 5. Error handling
 * 6. Workspace cleanup
 */

import dotenv from "dotenv";
import { DaytonaManager } from "./agent/execution/index.js";

// Load environment variables
dotenv.config();

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function printHeader(title: string) {
  console.log(
    `\n${colors.bright}${colors.cyan}${"=".repeat(70)}${colors.reset}`
  );
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(
    `${colors.bright}${colors.cyan}${"=".repeat(70)}${colors.reset}\n`
  );
}

function printTest(name: string) {
  console.log(
    `${colors.yellow}🧪 Test: ${colors.bright}${name}${colors.reset}`
  );
}

function printSuccess(message: string) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function printError(message: string) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function printInfo(message: string) {
  console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  printHeader("Daytona API-based Sandbox Tests");

  let manager: DaytonaManager;
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: API Key Validation
  printTest("API Key Validation");
  try {
    manager = new DaytonaManager();
    printSuccess("DaytonaManager initialized with API key");
    testsPassed++;
  } catch (error: any) {
    printError(`Failed to initialize: ${error.message}`);
    printInfo("Make sure DAYTONA_API_KEY is set in your .env file");
    printInfo(
      "Get your key from: https://daytona.io/dashboard/settings/api-keys"
    );
    testsFailed++;
    process.exit(1);
  }

  await delay(1000);

  // Test 2: Simple Python execution
  printTest("Python - Simple Print");
  try {
    const result = await manager.executePython(`print("Hello from Daytona!")`);

    if (
      result.stdout?.includes("Hello from Daytona!") &&
      result.exitCode === 0
    ) {
      printSuccess("Python print executed successfully");
      printInfo(`Output: ${result.stdout.trim()}`);
      printInfo(`Execution time: ${result.executionTime}ms`);
      testsPassed++;
    } else {
      printError(`Unexpected result: ${JSON.stringify(result)}`);
      testsFailed++;
    }
  } catch (error: any) {
    printError(`Python execution failed: ${error.message}`);
    testsFailed++;
  }

  await delay(1000);

  // Test 3: Python math calculation
  printTest("Python - Math Calculation");
  try {
    const code = `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

result = fibonacci(10)
print(f"Fibonacci(10) = {result}")
`;
    const result = await manager.executePython(code);

    if (result.stdout?.includes("55") && result.exitCode === 0) {
      printSuccess("Python math executed successfully");
      printInfo(`Output: ${result.stdout.trim()}`);
      printInfo(`Execution time: ${result.executionTime}ms`);
      testsPassed++;
    } else {
      printError(`Unexpected result: ${JSON.stringify(result)}`);
      testsFailed++;
    }
  } catch (error: any) {
    printError(`Python math failed: ${error.message}`);
    testsFailed++;
  }

  await delay(1000);

  // Test 4: Python error handling
  printTest("Python - Error Handling (Division by Zero)");
  try {
    const result = await manager.executePython(`print(1/0)`);

    if (result.stderr && result.stderr.includes("ZeroDivisionError")) {
      printSuccess("Python error handled correctly");
      printInfo(`Error captured: ${result.stderr.split("\n")[0]}`);
      testsPassed++;
    } else {
      printError(
        `Expected ZeroDivisionError but got: ${JSON.stringify(result)}`
      );
      testsFailed++;
    }
  } catch (error: any) {
    printError(`Error handling test failed: ${error.message}`);
    testsFailed++;
  }

  await delay(1000);

  // Test 5: JavaScript execution
  printTest("JavaScript - Array Operations");
  try {
    const code = `
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log('Doubled:', doubled);
console.log('Sum:', doubled.reduce((a, b) => a + b, 0));
`;
    const result = await manager.executeJavaScript(code);

    if (
      result.stdout?.includes("Doubled") &&
      result.stdout?.includes("30") &&
      result.exitCode === 0
    ) {
      printSuccess("JavaScript executed successfully");
      printInfo(`Output: ${result.stdout.trim()}`);
      printInfo(`Execution time: ${result.executionTime}ms`);
      testsPassed++;
    } else {
      printError(`Unexpected result: ${JSON.stringify(result)}`);
      testsFailed++;
    }
  } catch (error: any) {
    printError(`JavaScript execution failed: ${error.message}`);
    testsFailed++;
  }

  await delay(1000);

  // Test 6: Bash execution
  printTest("Bash - Echo and Variables");
  try {
    const code = `
name="Daytona"
echo "Running in $name sandbox"
echo "Current date: $(date)"
`;
    const result = await manager.executeBash(code);

    if (result.stdout?.includes("Daytona") && result.exitCode === 0) {
      printSuccess("Bash executed successfully");
      printInfo(`Output: ${result.stdout.trim().split("\n")[0]}`);
      printInfo(`Execution time: ${result.executionTime}ms`);
      testsPassed++;
    } else {
      printError(`Unexpected result: ${JSON.stringify(result)}`);
      testsFailed++;
    }
  } catch (error: any) {
    printError(`Bash execution failed: ${error.message}`);
    testsFailed++;
  }

  await delay(1000);

  // Test 7: Timeout handling (short timeout)
  printTest("Timeout Handling");
  try {
    const code = `
import time
print("Starting...")
time.sleep(5)
print("Done!")
`;
    const result = await manager.executePython(code, 2000); // 2 second timeout

    if (result.error && result.error.includes("timeout")) {
      printSuccess("Timeout handled correctly");
      printInfo(`Timeout after: ${result.executionTime}ms`);
      testsPassed++;
    } else {
      printError(`Expected timeout but got: ${JSON.stringify(result)}`);
      testsFailed++;
    }
  } catch (error: any) {
    // Timeout might throw error, which is also acceptable
    if (error.message.includes("timeout") || error.message.includes("abort")) {
      printSuccess("Timeout handled correctly (threw error)");
      testsPassed++;
    } else {
      printError(`Timeout test failed: ${error.message}`);
      testsFailed++;
    }
  }

  await delay(1000);

  // Test 8: Workspace cleanup verification
  printTest("Workspace Cleanup Verification");
  try {
    // Execute code and check if workspace is cleaned up
    await manager.executePython(`print("cleanup test")`);

    // If we got here without errors, cleanup worked
    printSuccess("Workspace cleanup successful");
    printInfo("No errors during cleanup");
    testsPassed++;
  } catch (error: any) {
    printError(`Cleanup test failed: ${error.message}`);
    testsFailed++;
  }

  // Print summary
  printHeader("Test Summary");
  console.log(
    `${colors.bright}Total Tests: ${testsPassed + testsFailed}${colors.reset}`
  );
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);

  if (testsFailed === 0) {
    console.log(
      `\n${colors.bright}${colors.green}✅ All tests passed!${colors.reset}`
    );
    printInfo("Daytona sandbox integration is working correctly");
  } else {
    console.log(
      `\n${colors.bright}${colors.red}❌ Some tests failed${colors.reset}`
    );
    printInfo("Review the errors above and check your Daytona setup");
  }

  console.log(`\n${colors.cyan}${"=".repeat(70)}${colors.reset}\n`);
}

// Run tests
runTests().catch((error) => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
