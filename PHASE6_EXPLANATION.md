# Phase 6: Formatter Refactoring - Strategy Pattern

## 🎯 What We're Doing

We're extracting **formatter.ts** (257 lines) into focused formatter classes using the **Strategy Pattern**.

## 🔍 Current State Analysis

### Functions in formatter.ts:

1. `formatPlan()` - Colored plan output (63 lines)
2. `formatPlanPlainText()` - Plain text plan (28 lines)
3. `formatPlanAsJson()` - JSON plan (3 lines)
4. `formatPlanWithJson()` - Combined format (6 lines)
5. `formatToolResult()` - Tool results with routing (35 lines)
6. `formatReadFileResult()` - Read file formatting
7. `formatListFilesResult()` - List files formatting
8. `formatEditFileResult()` - Edit file formatting
9. `formatGenericResult()` - Generic formatting
10. `formatError()` - Error formatting (3 lines)
11. `formatToolConsentRequest()` - Consent formatting (60 lines)

**Total**: 257 lines with mixed responsibilities

## ⚠️ Problems

1. **Multiple Concerns**: Plans, tools, errors, consent all in one file
2. **Hard to Extend**: Adding new format requires modifying existing file
3. **Mixed Abstraction Levels**: High-level (`formatPlan`) and low-level (`formatReadFileResult`) in same file
4. **Tightly Coupled**: All formatting tied to ANSI colors

## ✨ Strategy Pattern Solution

### What is Strategy Pattern?

The **Strategy Pattern** defines a family of algorithms (formatters), encapsulates each one, and makes them interchangeable.

**Think of it like a restaurant**:

- Customer orders "pasta" (the data)
- Waiter asks "which style?" (which strategy)
- Kitchen has different chefs for Italian, Japanese, American (concrete strategies)
- Each chef makes pasta their own way (execute the strategy)

### Our Implementation:

```
Formatter Interface (the contract)
        ↓
        ├── PlanFormatter (handles all plan formatting)
        ├── ToolFormatter (handles all tool formatting)
        └── ConsentFormatter (handles consent requests)

FormatterService (chooses which formatter to use)
```

## 🏗️ Implementation Plan

### Step 1: Create Formatter Interface

```typescript
// formatting/types.ts
export interface Formatter<T = any> {
  format(data: T, options?: FormatOptions): string;
}

export interface FormatOptions {
  style?: "colored" | "plain" | "json";
  maxLength?: number;
}
```

### Step 2: Create PlanFormatter

```typescript
// formatting/PlanFormatter.ts
export class PlanFormatter implements Formatter<Plan> {
  formatColored(plan: Plan): string {
    /* formatPlan logic */
  }
  formatPlain(plan: Plan): string {
    /* formatPlanPlainText logic */
  }
  formatJson(plan: Plan): string {
    /* formatPlanAsJson logic */
  }

  format(plan: Plan, options?: FormatOptions): string {
    switch (options?.style || "colored") {
      case "colored":
        return this.formatColored(plan);
      case "plain":
        return this.formatPlain(plan);
      case "json":
        return this.formatJson(plan);
    }
  }
}
```

### Step 3: Create ToolFormatter

```typescript
// formatting/ToolFormatter.ts
export class ToolFormatter implements Formatter {
  private specificFormatters = {
    read_file: this.formatReadFile,
    list_files: this.formatListFiles,
    edit_file: this.formatEditFile,
  };

  format(toolName: string, input: ToolInput, result: string): string {
    // Routes to specific formatter
  }
}
```

### Step 4: Create ConsentFormatter

```typescript
// formatting/ConsentFormatter.ts
export class ConsentFormatter implements Formatter {
  format(toolName: string, args: Record<string, unknown>): string {
    // formatToolConsentRequest logic
  }
}
```

### Step 5: Create FormatterService

```typescript
// formatting/FormatterService.ts
export class FormatterService {
  private planFormatter = new PlanFormatter();
  private toolFormatter = new ToolFormatter();
  private consentFormatter = new ConsentFormatter();

  formatPlan(plan: Plan, style?: "colored" | "plain" | "json"): string {
    return this.planFormatter.format(plan, { style });
  }

  formatToolResult(tool: string, input: ToolInput, result: string): string {
    return this.toolFormatter.format(tool, input, result);
  }

  formatConsent(tool: string, args: Record<string, unknown>): string {
    return this.consentFormatter.format(tool, args);
  }
}
```

## 📊 Expected Impact

### Code Reduction

```
formatter.ts:     257 lines → ~50 lines (exports + backwards compatibility)
PlanFormatter:     ~90 lines (all plan formatting)
ToolFormatter:     ~80 lines (all tool formatting)
ConsentFormatter:  ~70 lines (consent formatting)
FormatterService:  ~40 lines (orchestration)
types.ts:          ~20 lines (interfaces)

Total new code: ~350 lines (more lines, but much better organized!)
```

### Benefits

- ✅ **Single Responsibility**: Each formatter has ONE job
- ✅ **Easy to Test**: Test each formatter independently
- ✅ **Easy to Extend**: Add new formatter without modifying existing
- ✅ **Swappable**: Can swap formatters at runtime
- ✅ **Open/Closed**: Add formats without changing code

## 🧪 Testing Strategy

### Test Each Formatter

```typescript
// Test PlanFormatter
const formatter = new PlanFormatter();
const colored = formatter.format(mockPlan, { style: "colored" });
assert(colored.includes("EXECUTION PLAN"));

const plain = formatter.format(mockPlan, { style: "plain" });
assert(!plain.includes("\u001b")); // No ANSI codes

const json = formatter.format(mockPlan, { style: "json" });
const parsed = JSON.parse(json);
assert(parsed.goal === mockPlan.goal);
```

### Integration Test

```typescript
// Test FormatterService
const service = new FormatterService();
const result = service.formatPlan(mockPlan);
assert(result.includes("EXECUTION PLAN"));
```

## 🎓 Principles Applied

1. **Strategy Pattern**: Different formatting algorithms
2. **Single Responsibility**: One formatter, one purpose
3. **Open/Closed**: Add formats without modifying existing
4. **Dependency Inversion**: Depend on Formatter interface
5. **Separation of Concerns**: Plan ≠ Tool ≠ Consent formatting

## 🚀 Implementation Order

1. ✅ Create explanation (this file)
2. ⏳ Create types.ts with interfaces
3. ⏳ Create PlanFormatter (test immediately)
4. ⏳ Create ToolFormatter (test immediately)
5. ⏳ Create ConsentFormatter (test immediately)
6. ⏳ Create FormatterService (test integration)
7. ⏳ Update agent.ts to use new service
8. ⏳ Run all tests (should pass!)

---

**Ready to build!** Let's create the formatters step by step, testing each one as we go!
