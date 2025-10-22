# Quick Reference: Where to Apply Refactoring Next

## 🎯 TL;DR - Top 3 Opportunities

### 1. **formatter.ts** (256 lines) 🔴 DO THIS FIRST

- **Problem**: 7 different formatting functions in one file
- **Solution**: Strategy Pattern - separate formatters
- **Impact**: High (affects readability everywhere)
- **Risk**: Low (pure functions, easy to test)
- **Time**: 1 week

### 2. **execution.ts** (126 lines) 🔴 DO THIS SECOND

- **Problem**: Parsing + execution + formatting mixed
- **Solution**: Split into ToolParser, ToolExecutor, ResponseBuilder
- **Impact**: High (easier to test tool execution)
- **Risk**: Low (well-defined interfaces)
- **Time**: 1 week

### 3. **jsonParsing.ts** (243 lines) 🟡 DO THIS THIRD

- **Problem**: Complex if/else chains for parsing
- **Solution**: Chain of Responsibility - parser chain
- **Impact**: Medium (more parsing strategies)
- **Risk**: Medium (parsing logic is tricky)
- **Time**: 1-2 weeks

---

## 📊 File Analysis Summary

| File                  | Lines | Issue                    | Pattern to Apply        | Priority | Effort   |
| --------------------- | ----- | ------------------------ | ----------------------- | -------- | -------- |
| **formatter.ts**      | 256   | Multiple format concerns | Strategy Pattern        | 🔴 High  | 1 week   |
| **execution.ts**      | 126   | Mixed parsing/execution  | SRP + Separation        | 🔴 High  | 1 week   |
| **jsonParsing.ts**    | 243   | Complex conditionals     | Chain of Responsibility | 🟡 Med   | 2 weeks  |
| **storage.ts**        | 671   | God Object (DB)          | Repository Pattern      | 🟢 Low   | 1 month  |
| **ContextManager.ts** | 492   | Already decent           | Query Builders          | 🟢 Low   | Optional |

---

## 🚀 Quick Start Guide for Phase 6 (Formatters)

### Step 1: Create the Strategy Interface (5 min)

```typescript
// src/agent/formatting/types.ts
export interface Formatter {
  format(data: any): string;
  supports(type: string): boolean;
}
```

### Step 2: Create Plan Formatter (30 min)

```typescript
// src/agent/formatting/PlanFormatter.ts
export class PlanFormatter implements Formatter {
  supports(type: string): boolean {
    return type === "plan";
  }

  format(plan: Plan): string {
    // Move formatPlan() logic here
  }

  formatPlain(plan: Plan): string {
    // Move formatPlanPlainText() logic here
  }

  formatJson(plan: Plan): string {
    // Move formatPlanAsJson() logic here
  }
}
```

### Step 3: Create Tool Formatter (30 min)

```typescript
// src/agent/formatting/ToolFormatter.ts
export class ToolFormatter implements Formatter {
  supports(type: string): boolean {
    return type === "tool" || type === "error";
  }

  formatResult(tool: string, input: any, result: any): string {
    // Move formatToolResult() logic here
  }

  formatError(tool: string, error: string): string {
    // Move formatError() logic here
  }

  formatConsent(tool: string): string {
    // Move formatToolConsentRequest() logic here
  }
}
```

### Step 4: Create Formatter Service (20 min)

```typescript
// src/agent/formatting/FormatterService.ts
export class FormatterService {
  private formatters = new Map<string, Formatter>();

  constructor() {
    this.register(new PlanFormatter());
    this.register(new ToolFormatter());
  }

  register(formatter: Formatter) {
    // Register formatter
  }

  format(type: string, data: any): string {
    const formatter = this.findFormatter(type);
    return formatter.format(data);
  }
}
```

### Step 5: Update agent.ts (10 min)

```typescript
// Old:
import { formatPlan, formatToolResult } from "./formatter.js";
console.log(formatPlan(plan));

// New:
import { FormatterService } from "./formatting/FormatterService.js";
const formatter = new FormatterService();
console.log(formatter.format("plan", plan));
```

### Step 6: Test (30 min)

```typescript
// src/test-formatters.ts
const service = new FormatterService();
const result = service.format("plan", mockPlan);
assert(result.includes("EXECUTION PLAN"));
```

**Total Time**: ~2-3 hours hands-on coding!

---

## 🧪 Testing Checklist

Before refactoring any file:

- [ ] Identify all functions/classes
- [ ] Note all dependencies
- [ ] Write tests for current behavior
- [ ] Run tests (should pass)

After refactoring:

- [ ] Run original tests (should still pass)
- [ ] Add tests for new structure
- [ ] Test edge cases
- [ ] Update documentation

---

## ⚠️ Red Flags - When NOT to Refactor

Don't refactor if:

- [ ] No tests exist (write tests first!)
- [ ] Code rarely changes
- [ ] Under tight deadline
- [ ] Team doesn't understand pattern
- [ ] Production bugs need fixing

---

## ✅ Green Lights - When TO Refactor

Do refactor if:

- [x] File hard to understand
- [x] Adding features is painful
- [x] Same bugs keep appearing
- [x] Hard to test
- [x] Team agrees it's a problem
- [x] Tests exist or can be written

---

## 💡 Refactoring Principles Quick Reference

### Phase 1-5 (Already Applied)

✅ **Pure Functions** - Same input → same output  
✅ **Single Responsibility** - One class, one job  
✅ **Command Pattern** - Requests as objects  
✅ **Factory Pattern** - Create through factories  
✅ **Dependency Injection** - Inject dependencies

### Phase 6-9 (To Apply)

⏳ **Strategy Pattern** - Swap algorithms at runtime  
⏳ **Chain of Responsibility** - Pass request through chain  
⏳ **Repository Pattern** - Abstract data access  
⏳ **Builder Pattern** - Construct complex objects

---

## 📈 Expected Impact Timeline

```
Month 1 (You are here ✅)
├─ Week 1: Planning & Analysis ✅
├─ Week 2: Phase 1-2 (Pure Functions, UI Renderer) ✅
├─ Week 3: Phase 3 (Session Service) ✅
└─ Week 4: Phase 4-5 (Command Service, Testing) ✅
   Result: agent.ts 437 → 259 lines (40.7% reduction)

Month 2 (Next steps ⏳)
├─ Week 1: Phase 6 (Formatter) ⏳
│  Result: formatter.ts 256 → ~80 lines
├─ Week 2: Phase 7 (Execution) ⏳
│  Result: execution.ts 126 → ~40 lines per class
├─ Week 3: Phase 8 (Parsing) ⏳
│  Result: jsonParsing.ts 243 → ~60 lines per parser
└─ Week 4: Testing & Documentation ⏳

Month 3 (Optional)
└─ Phase 9: Storage (Repository Pattern)
   Result: storage.ts 671 → ~100 lines per repository
   ⚠️  Only if database pain points exist!
```

---

## 🎓 What You've Already Learned

Through Phases 1-5, you've mastered:

- ✅ Identifying God Objects
- ✅ Extracting pure functions
- ✅ Creating focused services
- ✅ Applying design patterns
- ✅ Dependency injection
- ✅ Testing refactored code
- ✅ Safe incremental refactoring

**You can apply these same skills to the remaining files!**

---

## 🔥 Quick Wins (Can Do Today!)

### 1. Extract Color Helper (15 min)

```typescript
// src/agent/utils/ColorHelper.ts
export class ColorHelper {
  static success(text: string) {
    return `${COLORS.green}${text}${COLORS.reset}`;
  }

  static error(text: string) {
    return `${COLORS.red}${text}${COLORS.reset}`;
  }

  static highlight(text: string) {
    return `${COLORS.brightYellow}${text}${COLORS.reset}`;
  }
}

// Usage
console.log(ColorHelper.success("✅ Tests passed!"));
```

### 2. Extract Path Utilities (15 min)

```typescript
// src/agent/utils/pathUtils.ts
export const removeAtPrefix = (path: string): string => {
  return path.replace(/^@/, "");
};

export const addAtPrefix = (path: string): string => {
  return path.startsWith("@") ? path : `@${path}`;
};

export const normalizePath = (path: string): string => {
  return path.replace(/\\/g, "/");
};
```

### 3. Extract Validation (20 min)

```typescript
// src/agent/validators/PlanValidator.ts
export class PlanValidator {
  static isValid(plan: Plan): boolean {
    return !!(plan && plan.goal && Array.isArray(plan.steps));
  }

  static validate(plan: Plan): ValidationResult {
    const errors: string[] = [];
    if (!plan) errors.push("Plan is null or undefined");
    if (!plan.goal) errors.push("Plan missing goal");
    if (!plan.steps) errors.push("Plan missing steps");
    if (!Array.isArray(plan.steps)) errors.push("Steps must be array");

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

---

## 📚 Resources

### Patterns Used

- **Strategy Pattern**: formatter.ts → Multiple formatters
- **Chain of Responsibility**: jsonParsing.ts → Parser chain
- **Repository Pattern**: storage.ts → Data access layer
- **Factory Pattern**: Already used in UIRenderer
- **Command Pattern**: Already used in CommandService

### Books Referenced

- "Composing Software" by Eric Elliott
- "Refactoring" by Martin Fowler
- "Clean Code" by Robert Martin
- "Design Patterns" by Gang of Four

---

## 🎯 Your Next Action

1. **Review** `FURTHER_REFACTORING_ANALYSIS.md` in detail
2. **Choose** Phase 6 (Formatters) as next target
3. **Plan** 1 week sprint for formatter refactoring
4. **Test** current formatter.ts behavior first
5. **Refactor** incrementally (one formatter at a time)
6. **Celebrate** when complete! 🎉

---

**Remember**: You've already proven you can do this! Agent.ts went from 437 → 259 lines with 0 regressions and 100% test passing. The same methodology works for any file! 🚀
