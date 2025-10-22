# Refactoring Roadmap 🚀

## Current State Analysis

**File**: `src/agent/agent.ts` (437 lines)

**Problems Identified**:

1. ❌ **God Object** - Agent class does too many things
2. ❌ **Mixed Responsibilities** - Session, UI, commands, string utils all in one class
3. ❌ **Duplicate Code** - React rendering pattern repeated 2 times
4. ❌ **Hard to Test** - Everything coupled together
5. ❌ **Poor Reusability** - Can't reuse string utils or UI rendering elsewhere

---

## Refactoring Strategy

We'll apply the concepts from `COMPOSING_SOFTWARE_CONCEPTS.md` step-by-step:

### Phase 1: Pure Functions (Extract Utilities) ✅

**Concept**: Pure Functions + Single Responsibility
**Why**: String manipulation functions are pure - no side effects, same input → same output
**Impact**: Low risk, high value (easier to test, reuse)

**Extract**:

- `extractFileReferences(content: string): string[]` → `src/agent/utils/stringUtils.ts`
- `generateSessionName(message: string): string` → `src/agent/utils/stringUtils.ts`

**Benefits**:

- ✅ Can test these functions in isolation
- ✅ Can reuse in other parts of codebase
- ✅ Agent.ts becomes simpler
- ✅ Pure functions = no mocking needed in tests

**Expected Reduction**: ~40 lines from agent.ts

---

### Phase 2: UI Rendering Service (Factory Pattern) 🎨

**Concept**: Higher-Order Functions + Factory Pattern + DRY
**Why**: React component rendering code is duplicated twice (showSessionSwitcher, showConversationHistory)
**Impact**: Medium risk, high value (removes duplication)

**Create**:

- `src/agent/services/UIRenderer.ts` - A factory that creates a component renderer
- One centralized function that handles ALL React rendering

**Before**:

```typescript
// Duplicated in 2 places (60+ lines each)
const React = await import("react");
const { render } = await import("ink");
const { Component } = await import("../components/Component.js");
return new Promise((resolve) => {
  const { unmount } = render(React.createElement(...));
  // ...cleanup logic
});
```

**After**:

```typescript
// One reusable renderer
private uiRenderer = createUIRenderer();
await this.uiRenderer.render(SessionSwitcher, props, { autoClose: false });
await this.uiRenderer.render(ConversationHistory, props, { autoClose: 10000 });
```

**Benefits**:

- ✅ DRY - code written once
- ✅ Consistent behavior across all UI components
- ✅ Easy to add new components
- ✅ Centralized React import management

**Expected Reduction**: ~100 lines from agent.ts

---

### Phase 3: Session Service (SRP + Abstraction) 🗂️

**Concept**: Separation of Concerns + Single Responsibility + Encapsulation
**Why**: Session management is a distinct responsibility
**Impact**: Medium risk, high value

**Create**:

- `src/agent/services/SessionService.ts`

**Extract methods**:

- `initializeSession()` → `SessionService.initialize(projectPath: string)`
- `autoNameSession()` → `SessionService.autoName(conversationId: string, message: string)`
- Session switching logic → `SessionService.switchTo(sessionId: string)`

**Benefits**:

- ✅ Agent doesn't need to know HOW sessions work
- ✅ Can test session logic independently
- ✅ Can swap session storage (SQLite → Redis) without touching Agent
- ✅ Clearer API for session operations

**Expected Reduction**: ~80 lines from agent.ts

---

### Phase 4: Command Service (Command Pattern) ⚙️

**Concept**: Command Pattern + Strategy Pattern
**Why**: Slash commands will grow over time - need extensible system
**Impact**: Low risk, high value (better architecture)

**Create**:

- `src/agent/services/CommandService.ts`
- `src/agent/commands/` directory with command objects

**Before**:

```typescript
switch (command) {
  case "/help":
    await this.showHelp();
    break;
  case "/sessions":
    await this.showSessionSwitcher();
    break;
  case "/history":
    await this.showConversationHistory();
    break;
}
```

**After**:

```typescript
// Commands as first-class objects
const commands = new Map([
  ["/help", new HelpCommand()],
  ["/sessions", new SessionsCommand(sessionService, uiRenderer)],
  ["/history", new HistoryCommand(uiRenderer)],
]);

await commandService.execute(userInput);
```

**Benefits**:

- ✅ Easy to add new commands (just add to Map)
- ✅ Commands can be undoable
- ✅ Commands can be logged/replayed
- ✅ Each command is independently testable

**Expected Reduction**: ~100 lines from agent.ts

---

### Phase 5: Conversation Manager (SRP + Immutability) 💬

**Concept**: Separation of Concerns + Encapsulation
**Why**: Conversation state management is separate from agent orchestration
**Impact**: Low risk, medium value

**Create**:

- `src/agent/services/ConversationManager.ts`

**Encapsulate**:

- `this.conversation` array
- Methods: `addMessage()`, `removeLastMessage()`, `getAll()`, `clear()`

**Benefits**:

- ✅ Agent can't accidentally corrupt conversation state
- ✅ Can enforce immutability patterns
- ✅ Easier to add conversation history features
- ✅ Clear API for conversation operations

**Expected Reduction**: ~20 lines from agent.ts

---

## Final Result

**agent.ts**: 437 lines → ~100 lines (77% reduction!)

**New structure**:

```
src/agent/
  agent.ts                    (~100 lines - just orchestration!)

  services/
    SessionService.ts         (session management)
    UIRenderer.ts             (React rendering)
    CommandService.ts         (command execution)
    ConversationManager.ts    (conversation state)

  commands/
    HelpCommand.ts
    SessionsCommand.ts
    HistoryCommand.ts

  utils/
    stringUtils.ts            (pure functions)
```

---

## Testing Strategy

After **each phase**:

1. ✅ Run existing test suite: `npm test`
2. ✅ Manual smoke test: Start agent, send message, verify it works
3. ✅ Add new unit tests for extracted services
4. ✅ Commit changes with descriptive message

**Test files to create**:

- `src/agent/utils/stringUtils.test.ts`
- `src/agent/services/SessionService.test.ts`
- `src/agent/services/UIRenderer.test.ts`
- `src/agent/services/CommandService.test.ts`

---

## Rollout Order (Safest First)

1. **Phase 1** (Pure Functions) - Zero risk, pure functions
2. **Phase 2** (UI Renderer) - Low risk, UI is isolated
3. **Phase 3** (Session Service) - Medium risk, test carefully
4. **Phase 4** (Command Service) - Low risk, commands are simple
5. **Phase 5** (Conversation Manager) - Low risk, simple wrapper

---

## Success Metrics

- ✅ All 35 tests passing
- ✅ Agent still works in real usage
- ✅ Each service has unit tests
- ✅ Code coverage maintained or improved
- ✅ agent.ts reduced from 437 → ~100 lines
- ✅ Each class/function has single responsibility
- ✅ No duplicate code

---

Ready to start? We'll begin with **Phase 1: Pure Functions** 🎯
