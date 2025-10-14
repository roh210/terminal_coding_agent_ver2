/**
 * Unified Code Execution Tool - Option 4: Context-Aware Hybrid
 *
 * Architecture:
 * - Known safe patterns (npm, git) → Execute locally (fast)
 * - Everything else → Execute in Daytona sandbox (safe)
 *
 * Security Philosophy:
 * - Whitelist approach: Only known-safe commands run locally
 * - Fail-safe default: Unknown code always sandboxed
 * - No pattern matching for "danger" - we only identify safety
 *
 * Design Benefits:
 * - Simple: 10 patterns vs 200+ in pattern-matching approach
 * - Secure: Defaults to sandbox, not local
 * - Fast: Common workflows (npm/git) stay local
 * - Maintainable: Small whitelist easy to audit
 */

import { ToolDefinition } from "../types.js";
import { DaytonaManager } from "../execution/index.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

let daytonaManager: DaytonaManager | null = null;

/**
 * Get or create singleton DaytonaManager instance
 */
const getDaytonaManager = (): DaytonaManager => {
  if (!daytonaManager) {
    try {
      daytonaManager = new DaytonaManager();
    } catch (error: any) {
      throw new Error(
        `Failed to initialize Daytona Manager: ${error.message}\n\n` +
          `Make sure you have DAYTONA_API_KEY in your .env file.\n` +
          `Get your API key from: https://daytona.io/dashboard/settings/api-keys`
      );
    }
  }
  return daytonaManager;
};

/**
 * Context Detection: Identify known-safe command patterns
 */
class ExecutionContext {
  /**
   * Check if command is a safe npm workflow
   */
  static isNpmCommand(code: string): boolean {
    const trimmed = code.trim();
    const npmPatterns = [
      /^npm\s+run\s+/i,
      /^npm\s+start$/i,
      /^npm\s+test$/i,
      /^npm\s+build$/i,
      /^npm\s+dev$/i,
      /^npm\s+install\s+/i,
      /^npm\s+ci$/i,
      /^npm\s+list$/i,
      /^npm\s+outdated$/i,
    ];

    return npmPatterns.some((pattern) => pattern.test(trimmed));
  }

  /**
   * Check if command is a read-only git operation
   */
  static isGitReadOnly(code: string): boolean {
    const trimmed = code.trim();
    const safeGitCommands = [
      "git status",
      "git log",
      "git diff",
      "git show",
      "git branch",
      "git remote",
      "git fetch",
      "git ls-files",
      "git rev-parse",
      "git describe",
    ];

    return safeGitCommands.some((cmd) => trimmed.startsWith(cmd));
  }

  /**
   * Check if command is a safe make target
   */
  static isMakeCommand(code: string): boolean {
    const trimmed = code.trim();
    const makePatterns = [
      /^make\s+build$/i,
      /^make\s+test$/i,
      /^make\s+clean$/i,
    ];

    return makePatterns.some((pattern) => pattern.test(trimmed));
  }

  /**
   * Check if command is a safe cargo workflow (Rust)
   */
  static isCargoCommand(code: string): boolean {
    const trimmed = code.trim();
    const cargoPatterns = [
      /^cargo\s+build$/i,
      /^cargo\s+test$/i,
      /^cargo\s+run$/i,
      /^cargo\s+check$/i,
      /^cargo\s+clean$/i,
    ];

    return cargoPatterns.some((pattern) => pattern.test(trimmed));
  }

  /**
   * Determine if code should run locally (known safe) or in sandbox
   */
  static shouldRunLocally(code: string): boolean {
    return (
      this.isNpmCommand(code) ||
      this.isGitReadOnly(code) ||
      this.isMakeCommand(code) ||
      this.isCargoCommand(code)
    );
  }

  /**
   * Get execution context for logging/debugging
   */
  static getContext(code: string): string {
    if (this.isNpmCommand(code)) return "npm workflow";
    if (this.isGitReadOnly(code)) return "git read-only";
    if (this.isMakeCommand(code)) return "make target";
    if (this.isCargoCommand(code)) return "cargo workflow";
    return "custom code";
  }
}

/**
 * Execute command locally with safety checks
 */
async function executeLocal(code: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(code, {
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024 * 10, // 10MB max output
    });

    const response: string[] = [];
    response.push(`\n${"=".repeat(60)}`);
    response.push(`⚡ Code Executed Locally (Fast)`);
    response.push(`${"=".repeat(60)}\n`);
    response.push(
      `📝 Command: ${code.substring(0, 100)}${code.length > 100 ? "..." : ""}`
    );
    response.push(`${"─".repeat(60)}\n`);

    if (stdout) {
      response.push(`📤 Output:`);
      response.push(stdout.trim());
    }

    if (stderr) {
      response.push(`\n⚠️  Stderr:`);
      response.push(stderr.trim());
    }

    if (!stdout && !stderr) {
      response.push(`✅ Command completed successfully (no output)`);
    }

    response.push(`\n✅ Exit code: 0`);
    response.push(`${"=".repeat(60)}`);

    return response.join("\n");
  } catch (error: any) {
    const response: string[] = [];
    response.push(`\n${"=".repeat(60)}`);
    response.push(`❌ Local Execution Failed`);
    response.push(`${"=".repeat(60)}\n`);
    response.push(
      `📝 Command: ${code.substring(0, 100)}${code.length > 100 ? "..." : ""}`
    );
    response.push(`${"─".repeat(60)}\n`);

    response.push(`❌ Error: ${error.message}`);

    if (error.stdout) {
      response.push(`\n📤 Stdout before error:`);
      response.push(error.stdout.trim());
    }

    if (error.stderr) {
      response.push(`\n📤 Stderr:`);
      response.push(error.stderr.trim());
    }

    if (error.code) {
      response.push(`\n🔢 Exit code: ${error.code}`);
    }

    response.push(`\n${"=".repeat(60)}`);

    return response.join("\n");
  }
}

/**
 * Execute code in Daytona sandbox
 */
async function executeSandbox(
  code: string,
  language: string,
  timeout: number = 30000
): Promise<string> {
  try {
    const manager = getDaytonaManager();
    const result = await manager.executeCode(code, {
      language: language as any,
      timeout,
      persistent: false, // Always cleanup for security
    });

    const response: string[] = [];
    response.push(`\n${"=".repeat(60)}`);
    response.push(`🔒 Code Executed in Sandbox (Safe & Isolated)`);
    response.push(`${"=".repeat(60)}\n`);
    response.push(`📝 Language: ${language}`);
    response.push(
      `📝 Code: ${code.substring(0, 100)}${code.length > 100 ? "..." : ""}`
    );
    response.push(`⏱️  Execution time: ${result.executionTime}ms`);
    response.push(`${"─".repeat(60)}\n`);

    if (result.stdout) {
      response.push(`📤 Output:`);
      response.push(result.stdout.trim());
    }

    if (result.stderr) {
      response.push(`\n⚠️  Stderr:`);
      response.push(result.stderr.trim());
    }

    if (!result.stdout && !result.stderr) {
      response.push(`✅ Code executed successfully (no output)`);
    }

    response.push(
      `\n${result.exitCode === 0 ? "✅" : "❌"} Exit code: ${
        result.exitCode || 0
      }`
    );
    response.push(`${"=".repeat(60)}`);

    return response.join("\n");
  } catch (error: any) {
    const response: string[] = [];
    response.push(`\n${"=".repeat(60)}`);
    response.push(`❌ Sandbox Execution Failed`);
    response.push(`${"=".repeat(60)}\n`);
    response.push(`📝 Language: ${language}`);
    response.push(
      `📝 Code: ${code.substring(0, 100)}${code.length > 100 ? "..." : ""}`
    );
    response.push(`${"─".repeat(60)}\n`);

    response.push(`❌ Error: ${error.message}`);
    response.push(`\n${"=".repeat(60)}`);

    return response.join("\n");
  }
}

/**
 * Infer language from code content
 */
function inferLanguage(code: string): string {
  // Check for shebang
  if (
    code.startsWith("#!/usr/bin/env python") ||
    code.startsWith("#!/usr/bin/python")
  ) {
    return "python";
  }
  if (
    code.startsWith("#!/usr/bin/env node") ||
    code.startsWith("#!/usr/bin/node")
  ) {
    return "javascript";
  }
  if (code.startsWith("#!/bin/bash") || code.startsWith("#!/bin/sh")) {
    return "bash";
  }

  // Check for language-specific patterns
  if (/^(import|from|def|class|print|if __name__)/m.test(code)) {
    return "python";
  }
  if (
    /(const|let|var|function|=>|console\.log|require|import.*from)/m.test(code)
  ) {
    return "javascript";
  }
  if (/(echo|cd|ls|grep|awk|sed|cat)\s/.test(code)) {
    return "bash";
  }
  if (/(fn main|use std|cargo|rustc)/.test(code)) {
    return "rust";
  }
  if (/(package main|func main|import "fmt")/.test(code)) {
    return "go";
  }

  // Default to bash for simple commands
  return "bash";
}

/**
 * Unified execute_code tool
 *
 * Routes code execution based on context:
 * - Known safe patterns → Local execution (fast)
 * - Custom code → Sandbox execution (safe)
 */
export const executeCodeTool: ToolDefinition = {
  name: "execute_code",
  description: `Execute code with automatic safety routing.

🎯 SMART ROUTING:
  • npm commands (npm run, npm test, etc.) → Local (fast)
  • git read-only (git status, git log, etc.) → Local (fast)  
  • make/cargo commands → Local (fast)
  • Custom Python/JavaScript/Bash code → Sandbox (safe, isolated)

🔒 SECURITY:
  • Known-safe workflows run locally for speed
  • Unknown code automatically sandboxed for safety
  • No need to choose - routing is automatic

💡 EXAMPLES:

Local execution (fast):
  code: "npm run dev"
  code: "git status"
  code: "make test"

Sandbox execution (safe):
  code: "print('hello')", language: "python"
  code: "console.log(2 + 2)", language: "javascript"
  code: "echo $USER", language: "bash"

📋 PARAMETERS:
  • code: The code/command to execute
  • language: (optional) "python", "javascript", "bash", "go", "rust"
    - Auto-detected if not specified
  • timeout: (optional) Timeout in milliseconds (default: 30000)

  ✅ RETURNS:
  • success: true/false
  • stdout: Command output
  • stderr: Error output  
  • exitCode: Exit code
  • executedIn: "local" or "sandbox" (for transparency)`,

  input_schema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The code or command to execute",
      },
      language: {
        type: "string",
        enum: ["python", "javascript", "bash", "go", "rust"],
        description:
          "Programming language (auto-detected if not specified). Use 'bash' for shell commands.",
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (default: 30000)",
        default: 30000,
      },
    },
    required: ["code"],
  },

  func: async (args): Promise<string> => {
    const input = args as {
      code: string;
      language?: string;
      timeout?: number;
    };

    const { code, timeout = 30000 } = input;
    let { language } = input;

    // Auto-detect language if not specified
    if (!language) {
      language = inferLanguage(code);
    }

    // Determine execution context
    const shouldRunLocally = ExecutionContext.shouldRunLocally(code);
    const context = ExecutionContext.getContext(code);

    // Log routing decision (for transparency)
    if (shouldRunLocally) {
      console.log(`⚡ Executing locally (${context})`);
      return executeLocal(code);
    } else {
      console.log(`🔒 Executing in sandbox (${context}, ${language})`);
      return executeSandbox(code, language, timeout);
    }
  },
};
