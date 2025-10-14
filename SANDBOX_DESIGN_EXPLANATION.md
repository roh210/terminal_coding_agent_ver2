# Sandbox Design: Current vs. Ideal Architecture

## Your Questions (Excellent Observations!)

### ❓ Question 1: Why is sandbox a separate tool from shell commands?

**Current**: User/AI explicitly chooses `execute_sandbox_code` vs `run_shell_command`  
**Problem**: AI has to decide what's "safe" - this is error-prone!

### ❓ Question 2: Why isn't sandbox execution automatic?

**Current**: Manual tool selection  
**Ideal**: Automatic safety detection

### ❓ Question 3: Why allow manual workspace management?

**Current**: User can specify `workspaceId` and `persistent` options  
**Problem**: Too complex for end users

---

## 🏗️ Current Architecture

```
User Request: "Run this Python code"
         ↓
    AI Model Decides
         ↓
    ┌────────┴────────┐
    ↓                 ↓
run_shell_command  execute_sandbox_code
    ↓                 ↓
Local Machine     Daytona Cloud
(Whitelisted)     (Fully Isolated)
```

### Current Safety Model

**`run_shell_command`**:

- ✅ Whitelist: `npm run`, `node`, `git status`, `ls`, `python`
- ⚠️ Approval needed: `rm`, `git push`, `git commit`
- ❌ Blocked: `format`, `shutdown`, `sudo`
- Runs on LOCAL machine (risky!)

**`execute_sandbox_code`**:

- ✅ No restrictions - fully isolated
- ✅ Cannot access local files
- ✅ Cannot modify host system
- Runs in CLOUD container (safe!)

### The Fundamental Problem

**The AI has to manually choose!**

```typescript
// AI sees these as separate tools:

Tool 1: run_shell_command
  Description: "Execute shell commands on the local machine"

Tool 2: execute_sandbox_code
  Description: "Execute code in isolated cloud sandbox"
```

**Question**: How does AI know which to use?  
**Answer**: It guesses based on descriptions! 😬

---

## 🎯 Proposed Ideal Architecture

### Design Option A: Smart Unified Tool

```
User Request: "Run this Python code"
         ↓
    execute_code (single tool)
         ↓
    Automatic Safety Analysis
         ↓
    ┌────────┴────────┐
    ↓                 ↓
  SAFE              RISKY
    ↓                 ↓
Local (fast)     Sandbox (safe)
```

**Implementation**:

```typescript
export const executeCodeTool: ToolDefinition = {
  name: "execute_code",
  description: `Execute code with automatic safety detection.
  
  Automatically determines if code should run:
  - Locally (for safe, trusted code like npm scripts)
  - In sandbox (for untrusted or experimental code)
  
  No need to choose - safety is automatic!`,

  inputSchema: {
    code: { type: "string", description: "Code to execute" },
    language: { type: "string", enum: ["python", "javascript", "bash"] },
    force_sandbox: {
      type: "boolean",
      description: "Optional: Force sandbox even if code appears safe",
      default: false,
    },
  },

  execute: async (input) => {
    const { code, language, force_sandbox } = input;

    // Automatic safety detection
    const safety = analyzeSafety(code, language);

    if (force_sandbox || safety.risk === "high" || safety.risk === "medium") {
      // Use sandbox
      console.log("🔒 Running in isolated sandbox for safety");
      return executeSandboxCodeTool.execute(input);
    } else {
      // Use local (with whitelist)
      console.log("⚡ Running locally (code appears safe)");
      return runShellCommandTool.execute(input);
    }
  },
};

function analyzeSafety(code: string, language: string) {
  const risks = {
    high: [
      /import\s+os/,
      /require\(['"]child_process['"]\)/,
      /eval\(/,
      /exec\(/,
      /subprocess/,
      /system\(/,
      /fetch\(/,
      /requests\./,
      /urllib/,
      /curl/,
      /fs\.unlink/,
      /fs\.rm/,
      /delete/,
      /DROP TABLE/,
    ],
    medium: [
      /open\(/,
      /write\(/,
      /mkdir/,
      /rmdir/,
      /git push/,
      /git commit/,
      /npm publish/,
    ],
    low: [
      /print\(/,
      /console\.log/,
      /Math\./,
      /len\(/,
      /\[.*\]/,
      /\{.*\}/,
      /for /,
      /while /,
    ],
  };

  // Check for high-risk patterns
  for (const pattern of risks.high) {
    if (pattern.test(code)) {
      return { risk: "high", reason: "Uses system/network APIs" };
    }
  }

  // Check for medium-risk patterns
  for (const pattern of risks.medium) {
    if (pattern.test(code)) {
      return { risk: "medium", reason: "Modifies filesystem" };
    }
  }

  return { risk: "low", reason: "Pure computation" };
}
```

**Advantages**:

- ✅ AI doesn't need to choose
- ✅ Automatic safety
- ✅ Faster for safe code (local)
- ✅ Safer for risky code (sandbox)
- ✅ Single mental model

**Disadvantages**:

- ⚠️ Pattern matching isn't perfect
- ⚠️ False positives (safe code flagged as risky)
- ⚠️ False negatives (risky code flagged as safe)

---

### Design Option B: Sandbox-First (Always Safe)

```
User Request: "Run code"
         ↓
execute_code (single tool)
         ↓
   Always Sandbox
    (unless explicitly local)
```

**Implementation**:

```typescript
export const executeCodeTool: ToolDefinition = {
  name: "execute_code",
  description: `Execute code safely in isolated sandbox.
  
  All code runs in isolated cloud containers by default.
  Use run_local=true only for trusted npm scripts.`,

  inputSchema: {
    code: { type: "string" },
    language: { type: "string" },
    run_local: {
      type: "boolean",
      description: "Set true ONLY for trusted npm/git commands",
      default: false,
    },
  },

  execute: async (input) => {
    if (input.run_local) {
      // Explicit local execution (for npm run, etc.)
      return runShellCommandTool.execute(input);
    } else {
      // Default: Always sandbox
      return executeSandboxCodeTool.execute(input);
    }
  },
};
```

**Advantages**:

- ✅ Secure by default
- ✅ Simple mental model
- ✅ No pattern matching needed

**Disadvantages**:

- ⚠️ Slower (always creates sandbox)
- ⚠️ Cost (Daytona API calls)
- ⚠️ Can't access local files

---

### Design Option C: Context-Aware (Hybrid)

```
User Request: "Run code"
         ↓
Smart Router
         ↓
    ┌────────┴────────┐
    ↓                 ↓
Known Pattern      New Code
    ↓                 ↓
run_shell_cmd     Sandbox
(npm run, etc)    (default)
```

**Implementation**:

```typescript
export const executeCodeTool: ToolDefinition = {
  name: "execute_code",
  description: `Execute code with context-aware routing.
  
  Automatically determines execution environment:
  - npm scripts → local (fast, safe)
  - git commands → local (read-only)
  - Custom code → sandbox (isolated)
  - File modifications → sandbox (safe)`,

  execute: async (input) => {
    const { code, language } = input;

    // Known safe patterns
    if (isNpmScript(code)) {
      return runShellCommandTool.execute({ command: code });
    }

    if (isGitReadOnly(code)) {
      return runShellCommandTool.execute({ command: code });
    }

    // Everything else → sandbox
    return executeSandboxCodeTool.execute(input);
  },
};

function isNpmScript(code: string): boolean {
  return /^npm (run|test|start|build)/.test(code.trim());
}

function isGitReadOnly(code: string): boolean {
  const readOnly = ["git status", "git log", "git diff", "git show"];
  return readOnly.some((cmd) => code.trim().startsWith(cmd));
}
```

**Advantages**:

- ✅ Best of both worlds
- ✅ Fast for known patterns
- ✅ Safe for unknown code
- ✅ Simple heuristics

**Disadvantages**:

- ⚠️ Need to maintain pattern list

---

## 🤖 Workspace Management

### Current Design (Too Complex)

```typescript
// User has to think about workspace lifecycle
execute_sandbox_code({
  code: "print('hello')",
  language: "python",
  workspaceId: "abc123", // Keep this workspace?
  persistent: true, // Don't cleanup?
});
```

### Proposed Design (Automatic)

```typescript
// Workspace lifecycle is automatic
execute_sandbox_code({
  code: "print('hello')",
  language: "python",
  // That's it! Workspace management is internal.
});
```

**Smart Workspace Management**:

```typescript
class SmartDaytonaManager {
  private workspacePool: Map<string, Workspace> = new Map();
  private lastUsed: Map<string, number> = new Map();

  async executeCode(code: string, language: string) {
    // Try to reuse recent workspace for this language
    const workspace = await this.getOrCreateWorkspace(language);

    try {
      return await this.execute(workspace.id, code);
    } finally {
      // Cleanup if workspace idle for > 5 minutes
      this.scheduleCleanup(workspace.id, 5 * 60 * 1000);
    }
  }

  private async getOrCreateWorkspace(language: string) {
    const recent = this.workspacePool.get(language);

    if (recent && this.isStillAlive(recent)) {
      // Reuse existing workspace (fast!)
      return recent;
    }

    // Create new workspace
    return await this.createWorkspace(language);
  }
}
```

**Benefits**:

- ✅ Fast: Reuses workspaces within 5 min window
- ✅ Clean: Auto-cleanup of idle workspaces
- ✅ Simple: No user configuration needed
- ✅ Cost-effective: Minimal workspace creation

---

## 📊 Comparison Table

| Feature             | Current Design       | Option A (Smart) | Option B (Sandbox-First) | Option C (Hybrid) |
| ------------------- | -------------------- | ---------------- | ------------------------ | ----------------- |
| **User Complexity** | High (2 tools)       | Low (1 tool)     | Low (1 tool)             | Low (1 tool)      |
| **AI Confusion**    | High                 | None             | None                     | None              |
| **Safety**          | Depends on AI        | Auto-detected    | Always safe              | Balanced          |
| **Performance**     | Good if chosen right | Optimized        | Slower                   | Optimized         |
| **Cost**            | Low (if local)       | Medium           | Higher                   | Low               |
| **Maintainability** | Medium               | Medium           | Easy                     | Medium            |
| **False Positives** | N/A                  | Possible         | N/A                      | Rare              |

---

## 💡 Recommendation

**I recommend Option C: Context-Aware Hybrid**

### Why?

1. **Simple patterns work well**:
   - `npm run dev` → Obviously local
   - `git status` → Obviously local
   - `print(user_input)` → Obviously sandbox
2. **Default to safety**:

   - Unknown code → Sandbox
   - Custom scripts → Sandbox
   - Only well-known patterns → Local

3. **Best performance**:

   - npm/git commands stay fast (local)
   - Custom code stays safe (sandbox)

4. **Easy to extend**:
   - Add more safe patterns over time
   - No complex ML needed

### Implementation Plan

1. **Merge tools into one**: `execute_code`
2. **Add smart routing**: npm/git → local, else → sandbox
3. **Auto workspace management**: Pool + auto-cleanup
4. **Remove user-facing options**: No `workspaceId`, `persistent`, etc.

---

## 🔧 How to Test in Another Project (Current Design)

Since you asked, here's how testing works **right now**:

### Option 1: Test as CLI tool

```powershell
# In your test project directory
cd C:\path\to\test-project

# Run the agent
npx C:\Users\Rohee\OneDrive\Documents\HeadStarter\projects\terminal_coding_agent_ver2

# Then interact:
> "Execute this Python code in a sandbox: print('hello')"
```

The agent will see `execute_sandbox_code` as an available tool and can use it.

### Option 2: Test programmatically

```javascript
// test-sandbox.js
import { DaytonaManager } from "terminal-coding-agent-ver2/dist/agent/execution/daytonaManager.js";

const manager = new DaytonaManager(
  process.env.DAYTONA_API_KEY,
  process.env.DAYTONA_API_URL
);

// Direct API usage
const result = await manager.executeCode('print("Hello!")', {
  language: "python",
});

console.log(result.stdout); // "Hello!"
```

### Option 3: Test through agent

```javascript
// test-agent.js
import { Agent } from "terminal-coding-agent-ver2/dist/agent/agent.js";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const agent = new Agent({
  client,
  tools: tools, // Includes execute_sandbox_code
  // ... other config
});

// Agent can now use execute_sandbox_code tool
await agent.executeTask('Run this Python: print("test")');
```

---

## 🎯 Next Steps

**What would you like to do?**

1. **Keep current design** and just test it → I'll guide you through testing
2. **Refactor to Option C** (recommended) → I'll implement the hybrid approach
3. **Discuss further** → We can explore other options

Let me know your preference!
