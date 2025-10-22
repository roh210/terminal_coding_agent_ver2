# Refactoring Roadmap: Current State & Opportunities

## 📊 Completed Refactoring (Phases 1-5)

```
┌─────────────────────────────────────────────────────────────┐
│                     agent.ts (BEFORE)                        │
│                        437 lines                             │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • User Input Handling                              │    │
│  │  • Session Management (initialize, switch, name)    │    │
│  │  • Command Handling (/help, /sessions, /history)    │    │
│  │  • UI Rendering (React/Ink components)             │    │
│  │  • Plan Creation & Execution                        │    │
│  │  • Inference & Tool Execution                       │    │
│  │  • String Utilities (file refs, naming)            │    │
│  │  • Error Handling                                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│              ❌ GOD OBJECT - Too many responsibilities       │
└─────────────────────────────────────────────────────────────┘

                            ↓  REFACTORED  ↓

┌──────────────────────────────────────────────────────────────┐
│                  agent.ts (AFTER)                             │
│                     259 lines (40.7% reduction)               │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  • User Input Handling                               │    │
│  │  • Plan Creation & Execution                         │    │
│  │  • Inference Orchestration                           │    │
│  │  • Service Coordination                              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│                 ✅ CLEAN ORCHESTRATOR                         │
└──────────────────────────────────────────────────────────────┘
           │              │              │              │
           ↓              ↓              ↓              ↓
    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Session  │   │ Command  │   │   UI     │   │  String  │
    │ Service  │   │ Service  │   │ Renderer │   │  Utils   │
    │ 280 lines│   │ 92 lines │   │ 134 lines│   │ 67 lines │
    └──────────┘   └──────────┘   └──────────┘   └──────────┘
    ✅ Sessions    ✅ Commands    ✅ Rendering   ✅ Pure Fns
```

---

## 🎯 Refactoring Opportunities (Phases 6-9)

### **Phase 6: Formatter Refactoring** 🔴 HIGH PRIORITY

```
┌─────────────────────────────────────────────────────────────┐
│             formatter.ts (CURRENT)                           │
│                   256 lines                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • formatPlan() - Colored plan                      │    │
│  │  • formatPlanPlainText() - Plain text               │    │
│  │  • formatPlanAsJson() - JSON format                 │    │
│  │  • formatPlanWithJson() - Combined                  │    │
│  │  • formatToolResult() - Tool results                │    │
│  │  • formatError() - Errors                           │    │
│  │  • formatToolConsentRequest() - Consent             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│         ⚠️  MULTIPLE FORMATTING CONCERNS                     │
└─────────────────────────────────────────────────────────────┘

                    ↓  APPLY STRATEGY PATTERN  ↓

┌──────────────────────────────────────────────────────────────┐
│              FormatterService (NEW)                           │
│                    ~80 lines                                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  format(item, format): string                        │    │
│  │    - delegates to appropriate formatter              │    │
│  │    - strategy pattern for format selection           │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
           │                    │                    │
           ↓                    ↓                    ↓
    ┌─────────────┐      ┌─────────────┐     ┌─────────────┐
    │    Plan     │      │    Tool     │     │   Console   │
    │  Formatter  │      │  Formatter  │     │  Formatter  │
    │  ~70 lines  │      │  ~60 lines  │     │  ~40 lines  │
    └─────────────┘      └─────────────┘     └─────────────┘
    • Colored            • Tool results       • Plain text
    • Plain text         • Errors             • JSON
    • JSON               • Consent            • Combined

Benefits:
✅ Each formatter has ONE responsibility
✅ Easy to add formats (Markdown, XML)
✅ Easy to test independently
✅ Runtime format switching
```

---

### **Phase 7: Execution Refactoring** 🔴 HIGH PRIORITY

```
┌─────────────────────────────────────────────────────────────┐
│               execution.ts (CURRENT)                         │
│                     126 lines                                │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • parseToolArguments() - Parse inputs              │    │
│  │  • createToolResponse() - Create responses          │    │
│  │  • executeSingleTool() - Execute with consent       │    │
│  │  • executeToolCall() - Execute from AI              │    │
│  │  • executeToolCalls() - Execute multiple            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│         ⚠️  MIXED CONCERNS (Parse + Execute + Format)        │
└─────────────────────────────────────────────────────────────┘

              ↓  APPLY SINGLE RESPONSIBILITY  ↓

┌──────────────────────────────────────────────────────────────┐
│                ToolExecutor (NEW)                             │
│                    ~50 lines                                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  executeSingle(tool, input): Result                  │    │
│  │  executeMultiple(tools): Result[]                    │    │
│  │  - uses ToolParser                                   │    │
│  │  - uses ToolResponseBuilder                          │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
           │                    │                    │
           ↓                    ↓                    ↓
    ┌─────────────┐      ┌─────────────┐     ┌─────────────┐
    │    Tool     │      │    Tool     │     │  Response   │
    │   Parser    │      │  Consent    │     │   Builder   │
    │  ~30 lines  │      │  Handler    │     │  ~40 lines  │
    └─────────────┘      └─────────────┘     └─────────────┘
    • Parse args         • Check consent      • Create msgs
    • Clean paths        • Format prompt      • Format errors
    • Validate           • Get user input     • Success/fail

Benefits:
✅ Clear separation of concerns
✅ Easy to mock parsers for testing
✅ Can swap argument formats
✅ Reusable components
```

---

### **Phase 8: Parsing Refactoring** 🟡 MODERATE PRIORITY

```
┌─────────────────────────────────────────────────────────────┐
│             jsonParsing.ts (CURRENT)                         │
│                   243 lines                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Complex if/else chains for parsing                 │    │
│  │  Multiple try/catch blocks                          │    │
│  │  Fallback strategies mixed together                 │    │
│  │  Hard to add new parsing strategies                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│         ⚠️  COMPLEX CONDITIONAL LOGIC                        │
└─────────────────────────────────────────────────────────────┘

          ↓  APPLY CHAIN OF RESPONSIBILITY  ↓

┌──────────────────────────────────────────────────────────────┐
│              ParsingChain (NEW)                               │
│                    ~40 lines                                  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  parse(response): Plan                               │    │
│  │    1. Try StrictJsonParser                           │    │
│  │    2. If fails → LenientParser                       │    │
│  │    3. If fails → RegexParser                         │    │
│  │    4. If fails → DefaultParser                       │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
           │         │         │         │
           ↓         ↓         ↓         ↓
    ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
    │Strict│→│Lenient│→│ Regex│→│Default│
    │ JSON │  │Parser│  │Parser│  │Parser│
    │~50 ln│  │~60 ln│  │~60 ln│  │~30 ln│
    └──────┘  └──────┘  └──────┘  └──────┘

Benefits:
✅ Each parser is isolated
✅ Easy to test strategies
✅ Clear precedence order
✅ Add new parsers easily
```

---

### **Phase 9: Storage Refactoring** 🟢 FUTURE (OPTIONAL)

```
┌─────────────────────────────────────────────────────────────┐
│               storage.ts (CURRENT)                           │
│                   671 lines (LARGEST FILE!)                  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  SQL queries mixed with business logic              │    │
│  │  CRUD for: Sessions, Conversations, Messages        │    │
│  │  Transaction management                             │    │
│  │  Connection handling                                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│         ⚠️  GOD OBJECT - Database edition                    │
└─────────────────────────────────────────────────────────────┘

              ↓  APPLY REPOSITORY PATTERN  ↓

┌──────────────────────────────────────────────────────────────┐
│           DatabaseConnection (NEW)                            │
│                 ~50 lines                                     │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  • Connection management                             │    │
│  │  • Transaction handling                              │    │
│  │  • Query execution helpers                           │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
           │            │            │            │
           ↓            ↓            ↓            ↓
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Session  │ │Conversation│ │ Message │ │  Base   │
    │Repository│ │Repository│ │Repository│ │Repository│
    │ ~100 ln  │ │ ~100 ln  │ │ ~100 ln  │ │ ~80 ln  │
    └──────────┘ └──────────┘ └──────────┘ └──────────┘
    • Create     • Create     • Create     • Common ops
    • Read       • Read       • Read       • Shared SQL
    • Update     • Update     • Update     • Helpers
    • Delete     • Delete     • Delete     • Validation

Benefits:
✅ Each repository handles ONE entity
✅ Easy to test with mocks
✅ Easy to swap DB (SQLite → PostgreSQL)
✅ Transactions isolated
✅ Clear data access layer

⚠️  WARNING: Large refactor - only if pain points exist!
```

---

## 📈 Cumulative Impact Projection

```
                  BEFORE ALL REFACTORING
┌──────────────────────────────────────────────────┐
│  agent.ts:           437 lines                    │
│  formatter.ts:       256 lines                    │
│  execution.ts:       126 lines                    │
│  jsonParsing.ts:     243 lines                    │
│  storage.ts:         671 lines                    │
│  ─────────────────────────────                    │
│  TOTAL:            1,733 lines                    │
│                                                   │
│  Issues:                                          │
│  ❌ Mixed concerns                                │
│  ❌ Hard to test                                  │
│  ❌ Hard to extend                                │
│  ❌ High coupling                                 │
└──────────────────────────────────────────────────┘

                           ↓
                   AFTER PHASES 1-5
┌──────────────────────────────────────────────────┐
│  agent.ts:           259 lines  ✅ (↓ 178)       │
│  + SessionService:   280 lines                    │
│  + CommandService:    92 lines                    │
│  + UIRenderer:       134 lines                    │
│  + stringUtils:       67 lines                    │
│  formatter.ts:       256 lines  ⏳                │
│  execution.ts:       126 lines  ⏳                │
│  jsonParsing.ts:     243 lines  ⏳                │
│  storage.ts:         671 lines  ⏳                │
│  ─────────────────────────────                    │
│  REFACTORED:         832 lines                    │
│  REMAINING:        1,296 lines                    │
│                                                   │
│  Progress:                                        │
│  ✅ Agent: Clean orchestrator                     │
│  ✅ Sessions: Managed                             │
│  ✅ Commands: Extensible                          │
│  ✅ UI: Centralized                               │
└──────────────────────────────────────────────────┘

                           ↓
              AFTER PHASES 6-9 (PROJECTED)
┌──────────────────────────────────────────────────┐
│  agent.ts:           259 lines  ✅                │
│  + Services:         573 lines  ✅                │
│  + Formatters:       170 lines  ✅ (↓ 86)        │
│  + Execution:        120 lines  ✅ (↓ 6)         │
│  + Parsers:          200 lines  ✅ (↓ 43)        │
│  + Repositories:     480 lines  ✅ (↓ 191)       │
│  ─────────────────────────────                    │
│  TOTAL:            1,802 lines (more modular!)    │
│  REDUCTION:          326 lines (18.8%)            │
│                                                   │
│  BUT MORE IMPORTANTLY:                            │
│  ✅ Single Responsibility                         │
│  ✅ Easy to test                                  │
│  ✅ Easy to extend                                │
│  ✅ Low coupling                                  │
│  ✅ High cohesion                                 │
└──────────────────────────────────────────────────┘
```

---

## 🎯 Recommended Next Action

### **Start with Phase 6: Formatter Refactoring**

**Why?**

1. ✅ High impact (256 lines → focused formatters)
2. ✅ Low risk (formatting is isolated)
3. ✅ You already know Strategy Pattern
4. ✅ Easy to test (pure functions)
5. ✅ Quick win (1 week effort)

**Steps:**

```
Day 1: Create FormatterService with Strategy Pattern
Day 2: Extract PlanFormatter class
Day 3: Extract ToolFormatter class
Day 4: Write tests for each formatter
Day 5: Update agent.ts to use new formatters
```

---

## 💡 Key Principle

> **"Refactor to relieve pain, not to achieve perfection"**

Don't refactor everything at once. Choose files that:

- Cause the most bugs
- Are hardest to change
- Need new features soon
- Team agrees are problematic

---

_This analysis shows that while you've already achieved significant improvements (40.7% in agent.ts), there are more opportunities. The key is to proceed incrementally and test thoroughly!_
