# Phase 1.6: Daytona Sandbox Implementation Plan

## 🎯 **Why Daytona?**

✅ **Better than E2B** - No SDK compatibility issues  
✅ **Better than Docker** - No local Docker installation required  
✅ **Cloud-based** - Runs in isolated cloud containers  
✅ **Developer-friendly** - Built for dev environments  
✅ **Language agnostic** - Supports Python, Node.js, Go, Rust, etc.

---

## 📋 **Implementation Plan**

### **Phase 1.6.1: Research & Setup** (30-45 min)

#### Step 1: Understand Daytona

- [ ] Read Daytona documentation: https://www.daytona.io/docs
- [ ] Understand Daytona architecture (CLI + API)
- [ ] Check pricing/free tier limits
- [ ] Identify best approach: CLI vs API vs SDK

#### Step 2: Install & Configure Daytona

- [ ] Install Daytona CLI globally
- [ ] Create Daytona account / API key
- [ ] Test basic Daytona workspace creation
- [ ] Verify workspace execution works

**Commands to test:**

```bash
# Install Daytona CLI
npm install -g @daytonaio/daytona

# Or use their installer
curl -sf https://download.daytona.io/daytona/install.sh | sh

# Login
daytona login

# Create test workspace
daytona create test-workspace

# Execute code in workspace
daytona exec test-workspace -- python -c "print('Hello')"

# Cleanup
daytona delete test-workspace
```

---

### **Phase 1.6.2: Design Integration** (1-2 hours)

#### Step 3: Design Architecture

**Option A: CLI-based (Recommended for MVP)**

```typescript
// Use Daytona CLI via child_process
run_shell_command({
  command: "daytona exec workspace -- python script.py",
});
```

**Pros:**

- ✅ Simple to implement
- ✅ No SDK dependencies
- ✅ Uses existing run_shell_command tool
- ✅ No import issues

**Cons:**

- ⚠️ Requires Daytona CLI installed
- ⚠️ Slower (CLI overhead)

**Option B: API-based (Better for production)**

```typescript
// Direct API calls to Daytona
class DaytonaManager {
  async createWorkspace();
  async executeCode(code, language);
  async deleteWorkspace();
}
```

**Pros:**

- ✅ Faster (no CLI overhead)
- ✅ More control
- ✅ Better error handling

**Cons:**

- ⚠️ More code to write
- ⚠️ Need to handle authentication

#### Step 4: Choose Implementation Strategy

**Recommended Approach: Hybrid**

1. Start with CLI-based (quick MVP)
2. Refactor to API later if needed

---

### **Phase 1.6.3: Implementation** (2-3 hours)

#### Step 5: Create Daytona Manager

**File:** `src/agent/execution/daytonaManager.ts`

```typescript
/**
 * DaytonaManager - Manages Daytona workspaces for sandboxed execution
 *
 * Architecture:
 * - Creates temporary workspaces on demand
 * - Executes code in isolated containers
 * - Cleans up after execution
 *
 * Security:
 * - Complete isolation (cloud containers)
 * - No access to host filesystem
 * - Automatic cleanup
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface DaytonaExecutionResult {
  stdout: string;
  stderr: string;
  error?: string;
  exitCode?: number;
  executionTime: number;
}

export interface DaytonaExecutionOptions {
  timeout?: number;
  language?: "python" | "javascript" | "bash" | "go" | "rust";
  workspaceName?: string;
}

export class DaytonaManager {
  private apiKey: string;
  private defaultTimeout: number = 60000; // 60 seconds

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DAYTONA_API_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "⚠️  DAYTONA_API_KEY not found. Some features may not work."
      );
    }
  }

  /**
   * Check if Daytona CLI is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      await execAsync("daytona version");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Execute code in a Daytona workspace
   */
  async executeCode(
    code: string,
    options: DaytonaExecutionOptions = {}
  ): Promise<DaytonaExecutionResult> {
    const startTime = Date.now();
    const workspaceName = options.workspaceName || `sandbox-${Date.now()}`;
    const language = options.language || "python";
    const timeout = options.timeout || this.defaultTimeout;

    try {
      // 1. Create workspace (if not exists)
      console.log(`📦 Creating Daytona workspace: ${workspaceName}...`);
      await this.createWorkspace(workspaceName, language);

      // 2. Execute code
      console.log(`⚡ Executing ${language} code...`);
      const result = await this.executeInWorkspace(
        workspaceName,
        code,
        language,
        timeout
      );

      // 3. Cleanup workspace
      console.log(`🧹 Cleaning up workspace...`);
      await this.deleteWorkspace(workspaceName);

      const executionTime = Date.now() - startTime;

      return {
        ...result,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      // Cleanup on error
      try {
        await this.deleteWorkspace(workspaceName);
      } catch {
        // Ignore cleanup errors
      }

      return {
        stdout: "",
        stderr: error.stderr || "",
        error: error.message,
        exitCode: error.code || 1,
        executionTime,
      };
    }
  }

  /**
   * Create a Daytona workspace
   */
  private async createWorkspace(name: string, language: string): Promise<void> {
    // Get appropriate template based on language
    const template = this.getTemplate(language);

    const command = `daytona create ${name} --template ${template} --yes`;
    await execAsync(command, { timeout: 30000 });
  }

  /**
   * Execute code in workspace
   */
  private async executeInWorkspace(
    workspaceName: string,
    code: string,
    language: string,
    timeout: number
  ): Promise<Omit<DaytonaExecutionResult, "executionTime">> {
    // Escape code for shell
    const escapedCode = code.replace(/'/g, "'\\''");

    // Build execution command based on language
    let execCommand: string;
    switch (language) {
      case "python":
        execCommand = `python3 -c '${escapedCode}'`;
        break;
      case "javascript":
        execCommand = `node -e '${escapedCode}'`;
        break;
      case "bash":
        execCommand = `bash -c '${escapedCode}'`;
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    const command = `daytona exec ${workspaceName} -- ${execCommand}`;

    try {
      const { stdout, stderr } = await execAsync(command, { timeout });
      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      };
    } catch (error: any) {
      return {
        stdout: error.stdout?.trim() || "",
        stderr: error.stderr?.trim() || "",
        error: error.message,
        exitCode: error.code || 1,
      };
    }
  }

  /**
   * Delete a workspace
   */
  private async deleteWorkspace(name: string): Promise<void> {
    try {
      await execAsync(`daytona delete ${name} --yes`, { timeout: 10000 });
    } catch (error) {
      console.error(`Failed to delete workspace ${name}:`, error);
    }
  }

  /**
   * Get Daytona template for language
   */
  private getTemplate(language: string): string {
    const templates: Record<string, string> = {
      python: "python",
      javascript: "node",
      bash: "ubuntu",
      go: "golang",
      rust: "rust",
    };
    return templates[language] || "ubuntu";
  }

  /**
   * Convenience methods for specific languages
   */
  async executePython(code: string, timeout?: number) {
    return this.executeCode(code, { language: "python", timeout });
  }

  async executeJavaScript(code: string, timeout?: number) {
    return this.executeCode(code, { language: "javascript", timeout });
  }

  async executeBash(code: string, timeout?: number) {
    return this.executeCode(code, { language: "bash", timeout });
  }
}
```

#### Step 6: Update Execution Index

**File:** `src/agent/execution/index.ts`

```typescript
export {
  DaytonaManager,
  DaytonaExecutionResult,
  DaytonaExecutionOptions,
} from "./daytonaManager.js";

// Keep SandboxManager for future reference
export {
  SandboxManager,
  ExecutionResult,
  ExecutionOptions,
} from "./sandboxManager.js";
```

#### Step 7: Create Daytona Sandbox Tool

**File:** `src/agent/tools/executeSandboxCode.ts`

```typescript
import { ToolDefinition, ExecuteCodeInput } from "../types.js";
import { DaytonaManager } from "../execution/index.js";

let daytonaManager: DaytonaManager | null = null;

const getDaytonaManager = (): DaytonaManager => {
  if (!daytonaManager) {
    try {
      daytonaManager = new DaytonaManager();
    } catch (error: any) {
      throw new Error(`Failed to initialize Daytona: ${error.message}`);
    }
  }
  return daytonaManager;
};

export const executeSandboxCodeTool: ToolDefinition = {
  name: "execute_sandbox_code",
  description: `Execute code in a fully isolated Daytona sandbox environment. 
  
Use this for:
- Testing untrusted or experimental code
- Running code snippets without saving to disk
- Quick calculations or validations
- Code that might have bugs or errors

Supports: Python, JavaScript, Bash

Security: Runs in isolated cloud containers with no access to host system.`,
  input_schema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The code to execute in the sandbox",
      },
      language: {
        type: "string",
        enum: ["python", "javascript", "bash"],
        description: "Programming language (defaults to python)",
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (default 60000, max 120000)",
      },
    },
    required: ["code"],
  },
  func: async (args: Record<string, unknown>) => {
    if (!("code" in args)) {
      throw new Error("Missing required parameter: code");
    }

    const input = args as ExecuteCodeInput;
    const { code, language = "python", timeout = 60000 } = input;

    // Validate timeout
    const safeTimeout = Math.min(timeout, 120000); // Max 2 minutes

    try {
      // Check if Daytona is installed
      const manager = getDaytonaManager();
      const isInstalled = await manager.isInstalled();

      if (!isInstalled) {
        return `❌ Daytona CLI is not installed.

To use sandboxed code execution, install Daytona:
npm install -g @daytonaio/daytona

Or visit: https://www.daytona.io/docs/installation

Alternative: Use run_shell_command to execute code from files.`;
      }

      // Execute code
      let result;
      switch (language) {
        case "python":
          result = await manager.executePython(code, safeTimeout);
          break;
        case "javascript":
          result = await manager.executeJavaScript(code, safeTimeout);
          break;
        case "bash":
          result = await manager.executeBash(code, safeTimeout);
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      // Format output
      const response: string[] = [];
      response.push(`\n${"=".repeat(60)}`);
      response.push(`🔒 Sandboxed Code Execution (${language})`);
      response.push(`${"=".repeat(60)}\n`);

      response.push(`📝 Code:\n${code}\n`);
      response.push(`${"─".repeat(60)}\n`);

      if (result.stdout) {
        response.push(`📤 Output:`);
        response.push(result.stdout);
      }

      if (result.stderr) {
        response.push(`\n⚠️  Stderr:`);
        response.push(result.stderr);
      }

      if (result.error) {
        response.push(`\n❌ Error: ${result.error}`);
      }

      response.push(`\n⏱️  Execution time: ${result.executionTime}ms`);
      response.push(`🔢 Exit code: ${result.exitCode || 0}`);
      response.push(`\n${"=".repeat(60)}`);

      return response.join("\n");
    } catch (error: any) {
      return `❌ Sandbox execution failed: ${error.message}`;
    }
  },
};
```

#### Step 8: Update Tool Exports

**File:** `src/agent/tools/index.ts`

```typescript
import { readFileTool } from "./readFile.js";
import { listFilesTool } from "./listFiles.js";
import { editFileTool } from "./editFile.js";
import { createDirectoryTool } from "./createDirectory.js";
import { undoEditTool } from "./undoEdit.js";
import { showDiffTool } from "./showDiff.js";
import { listRecentEditsTool } from "./listRecentEdits.js";
import { debugBufferTool } from "./debugBuffer.js";
// import { executeCodeTool } from "./executeCode.js"; // E2B - disabled
import { executeSandboxCodeTool } from "./executeSandboxCode.js"; // Daytona - NEW
import { runShellCommandTool } from "./runShellCommand.js";

export default [
  readFileTool,
  listFilesTool,
  editFileTool,
  createDirectoryTool,
  undoEditTool,
  showDiffTool,
  listRecentEditsTool,
  debugBufferTool,
  executeSandboxCodeTool, // Daytona sandboxed execution
  runShellCommandTool,
];
```

#### Step 9: Update Types & Constants

**File:** `src/agent/constants.ts`

Update PLANNING_PROMPT:

```typescript
Available tools: read_file, list_files, edit_file, create_directory, undo_edit, show_diff, list_recent_edits, debug_buffer, execute_sandbox_code, run_shell_command
```

Add to TOOL_NAMES:

```typescript
export const TOOL_NAMES = {
  // ... existing tools
  EXECUTE_SANDBOX_CODE: "execute_sandbox_code",
  RUN_SHELL_COMMAND: "run_shell_command",
} as const;
```

---

### **Phase 1.6.4: Testing** (1-2 hours)

#### Step 10: Create Test Script

**File:** `src/test-daytona.ts`

```typescript
/**
 * Test script for Daytona Sandbox Manager
 */

import { DaytonaManager } from "./agent/execution/daytonaManager.js";

console.log("🧪 Testing Daytona Sandbox Manager...\n");

async function runTests() {
  const manager = new DaytonaManager();

  // Test 1: Check installation
  console.log("1️⃣ Checking Daytona installation...");
  const installed = await manager.isInstalled();
  if (!installed) {
    console.error("❌ Daytona CLI not found. Please install it first:");
    console.error("   npm install -g @daytonaio/daytona");
    process.exit(1);
  }
  console.log("✅ Daytona CLI found\n");

  // Test 2: Simple Python execution
  console.log("2️⃣ Test: Simple Python print");
  try {
    const result = await manager.executePython('print("Hello from Daytona!")');
    console.log("Result:", result);
    console.log("✅ Test passed\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }

  // Test 3: Math calculation
  console.log("3️⃣ Test: Python calculation");
  try {
    const result = await manager.executePython("print(2 + 2)");
    console.log("Result:", result);
    console.log("✅ Test passed\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }

  // Test 4: JavaScript execution
  console.log("4️⃣ Test: JavaScript execution");
  try {
    const result = await manager.executeJavaScript(
      'console.log("Hello from Node!")'
    );
    console.log("Result:", result);
    console.log("✅ Test passed\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }

  // Test 5: Error handling
  console.log("5️⃣ Test: Error handling");
  try {
    const result = await manager.executePython("print(1/0)");
    console.log("Result:", result);
    console.log("✅ Error handled gracefully\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }

  console.log("═".repeat(60));
  console.log("🎉 All tests completed!");
  console.log("═".repeat(60));
}

runTests().catch(console.error);
```

#### Step 11: Unit Tests

Create test checklist:

- [ ] Daytona CLI detection works
- [ ] Python execution works
- [ ] JavaScript execution works
- [ ] Bash execution works
- [ ] Error handling works
- [ ] Timeout mechanism works
- [ ] Workspace cleanup works
- [ ] Multiple concurrent executions work

#### Step 12: Integration Tests

Test through agent:

```
You: execute this Python code in a sandbox: print("Hello from sandbox")

You: run this JavaScript in a sandbox: console.log(2 + 2)

You: test this Python code: print(1/0)

You: create a fibonacci function and test it in the sandbox
```

---

### **Phase 1.6.5: Documentation** (30 min)

#### Step 13: Create Documentation

**File:** `PHASE1.6_DAYTONA_IMPLEMENTATION.md`

Include:

- Why Daytona?
- How it works
- Installation guide
- Usage examples
- Comparison with E2B and Docker
- Troubleshooting
- Performance metrics

---

### **Phase 1.6.6: Cleanup & Optimization** (30 min)

#### Step 14: Final Tasks

- [ ] Remove E2B dependencies from package.json
- [ ] Update README with Daytona setup
- [ ] Add DAYTONA_API_KEY to .env.example
- [ ] Test all workflows end-to-end
- [ ] Commit changes with detailed message

---

## 📊 **Implementation Checklist**

### Research & Setup ✅

- [ ] Read Daytona docs
- [ ] Install Daytona CLI
- [ ] Test basic commands
- [ ] Get API key

### Implementation 🚧

- [ ] Create DaytonaManager class
- [ ] Create executeSandboxCode tool
- [ ] Update tool exports
- [ ] Update constants

### Testing 🧪

- [ ] Create test script
- [ ] Run unit tests
- [ ] Test through agent
- [ ] Verify cleanup works

### Documentation 📝

- [ ] Write implementation docs
- [ ] Update README
- [ ] Add troubleshooting guide
- [ ] Document API usage

### Finalization ✨

- [ ] Remove E2B code
- [ ] Update dependencies
- [ ] Commit changes
- [ ] Ready for Phase 2

---

## ⏱️ **Time Estimates**

| Phase            | Time          | Notes                  |
| ---------------- | ------------- | ---------------------- |
| Research & Setup | 30-45 min     | Install, test CLI      |
| Design           | 1-2 hours     | Architecture decisions |
| Implementation   | 2-3 hours     | Write code             |
| Testing          | 1-2 hours     | Unit + integration     |
| Documentation    | 30 min        | Write docs             |
| Cleanup          | 30 min        | Final touches          |
| **TOTAL**        | **6-9 hours** | Full implementation    |

---

## 🎯 **Success Criteria**

✅ Daytona CLI installed and working  
✅ DaytonaManager class functional  
✅ execute_sandbox_code tool integrated  
✅ All tests passing  
✅ Documentation complete  
✅ No E2B dependencies  
✅ Ready for production use

---

## 🔄 **Next Steps After Phase 1.6**

1. ✅ Phase 1.6 complete (Daytona sandbox)
2. ⏭️ Phase 2: Persistent Context Management
3. ⏭️ Phase 3: Enhanced Error Handling
4. ⏭️ Phase 4: Code Execution Safety (already done!)

---

**Ready to start? Let's begin with Step 1: Research & Setup!** 🚀
