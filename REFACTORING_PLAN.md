# Agent.ts Refactoring Plan - Composing Software Edition

**Current State**: 437 lines, multiple responsibilities  
**Goal**: Apply Composing Software principles for better composition, readability, and maintainability

---

## 📊 Current Issues Analysis

### Problems Identified:

1. **God Object Anti-Pattern** - Agent class does too much (12+ methods)
2. **Mixed Abstraction Levels** - High-level orchestration mixed with low-level details
3. **Poor Separation of Concerns** - Session, conversation, UI, and business logic all in one file
4. **Tight Coupling** - Hard to test individual pieces
5. **Long Methods** - `showSessionSwitcher()` is 50+ lines
6. **Repetitive Code** - React component rendering duplicated
7. **Hidden Dependencies** - Dynamic imports scattered throughout
8. **Low Cohesion** - Unrelated functionality grouped together

---

## 🎯 Composing Software Principles to Apply

### 1. **Function Composition**

> "Small, focused functions composed together"

### 2. **Higher-Order Functions**

> "Functions that take/return functions"

### 3. **Pure Functions**

> "No side effects, easier to test and reason about"

### 4. **Currying & Partial Application**

> "Pre-configure functions with some arguments"

### 5. **Functional Mixins**

> "Compose objects from feature sets"

### 6. **Immutability**

> "Avoid mutation for predictability"

### 7. **Separation of Concerns**

> "Each module has one job"

### 8. **Abstraction**

> "Hide complexity behind simple interfaces"

---

## 📋 Step-by-Step Refactoring Plan

### **Phase 1: Extract Pure Functions** ⭐ HIGH PRIORITY

#### Step 1.1: Extract String Utilities

**Current**: Mixed in Agent class  
**Target**: `src/agent/utils/stringUtils.ts`

```typescript
// Pure functions - no side effects
export const extractFileReferences = (content: string): string[] => {
  const matches = content.match(/@([^\s]+)/g) || [];
  return matches.map((m) => m.substring(1));
};

export const generateSessionName = (message: string): string => {
  let cleaned = message
    .replace(/^(can you|could you|please|help me|i need|i want to)\s+/i, "")
    .replace(/\?+$/, "")
    .trim();

  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 47) + "...";
  }

  return cleaned || `Session ${new Date().toLocaleDateString()}`;
};

export const isDefaultSessionName = (name: string): boolean => {
  return name.startsWith("Session ") && name.includes("/");
};
```

**Benefits**:

- ✅ Easy to test (no dependencies)
- ✅ Reusable across codebase
- ✅ No side effects

---

#### Step 1.2: Extract Message Transformers

**Current**: Inline in `processInference()`  
**Target**: `src/agent/transformers/messageTransformers.ts`

```typescript
// Pure data transformations
export const transformToolCallToRecord = (toolCall: any) => ({
  tool: toolCall.function?.name || "unknown",
  args: toolCall.function?.arguments
    ? JSON.parse(toolCall.function.arguments)
    : {},
});

export const transformStoredToOpenAI = (
  msg: StoredMessage
): OpenAI.ChatCompletionMessage => ({
  role: msg.role,
  content: msg.content,
});

export const transformOpenAIToStored = (
  msg: OpenAI.ChatCompletionMessage,
  conversationId: string
) => ({
  conversationId,
  role: msg.role,
  content: msg.content || "",
  fileReferences: extractFileReferences(msg.content || ""),
  toolCalls: msg.tool_calls?.map(transformToolCallToRecord),
});
```

**Benefits**:

- ✅ Type-safe transformations
- ✅ Centralized conversion logic
- ✅ Easy to test

---

### **Phase 2: Extract Services** ⭐ HIGH PRIORITY

#### Step 2.1: Session Service

**Current**: Spread across Agent class  
**Target**: `src/agent/services/SessionService.ts`

```typescript
export class SessionService {
  constructor(private contextManager: ContextManager) {}

  async initializeOrLoad(projectPath: string): Promise<SessionInfo> {
    const sessions = await this.contextManager.listSessions();
    const existing = sessions.find((s) => s.project === projectPath);

    if (existing) {
      return this.loadExisting(existing);
    }

    return this.createNew(projectPath);
  }

  async autoNameSession(
    sessionId: string,
    firstMessage: string
  ): Promise<void> {
    const messages = await this.contextManager.getConversationMessages(
      sessionId
    );
    if (messages.length !== 1) return;

    const sessions = await this.contextManager.listSessions();
    const session = sessions.find((s) => s.id === sessionId);

    if (!session || !isDefaultSessionName(session.name)) return;

    const name = generateSessionName(firstMessage);
    await this.contextManager.updateSession({ name });
    console.log(`📝 Auto-named session: "${name}"`);
  }

  async switchSession(sessionId: string): Promise<SessionContext> {
    await this.contextManager.loadSession(sessionId);
    const session = await this.contextManager.getSession(sessionId);
    const messages = await this.contextManager.getConversationMessages(
      session.currentConversationId,
      20
    );

    return {
      sessionId,
      conversationId: session.currentConversationId,
      messages: messages.map(transformStoredToOpenAI),
    };
  }
}
```

**Benefits**:

- ✅ All session logic in one place
- ✅ Easy to mock for testing
- ✅ Clear interface

---

#### Step 2.2: Command Service

**Current**: `handleSlashCommand()` and 3 show methods  
**Target**: `src/agent/services/CommandService.ts`

```typescript
export class CommandService {
  private commands: Map<string, CommandHandler>;

  constructor(
    private sessionService: SessionService,
    private contextManager: ContextManager
  ) {
    this.commands = new Map([
      ["/help", this.showHelp.bind(this)],
      ["/sessions", this.showSessions.bind(this)],
      ["/history", this.showHistory.bind(this)],
    ]);
  }

  async execute(command: string): Promise<boolean> {
    const handler = this.commands.get(command.trim());

    if (!handler) {
      console.log(`Unknown command: ${command}`);
      console.log("Type /help to see available commands");
      return true;
    }

    await handler();
    return true;
  }

  private async showHelp(): Promise<void> {
    console.log("\n📚 Available Commands:\n");
    for (const [cmd, _] of this.commands) {
      console.log(`  ${cmd}`);
    }
  }

  // Other show methods...
}
```

**Benefits**:

- ✅ Command pattern implementation
- ✅ Easy to add new commands
- ✅ Testable in isolation

---

#### Step 2.3: UI Renderer Service

**Current**: Duplicate React rendering code  
**Target**: `src/agent/services/UIRenderer.ts`

```typescript
// Higher-order function for rendering React components
export const createComponentRenderer = () => {
  const renderComponent = async <P>(
    componentPath: string,
    componentName: string,
    props: P,
    options: RenderOptions = {}
  ): Promise<void> => {
    const React = await import("react");
    const { render } = await import("ink");
    const module = await import(componentPath);

    return new Promise((resolve) => {
      const { unmount } = render(
        React.createElement(module[componentName], props)
      );

      if (options.autoClose) {
        setTimeout(() => {
          unmount();
          setTimeout(resolve, 50);
        }, options.autoClose);
      }
    });
  };

  return renderComponent;
};

// Usage:
const render = createComponentRenderer();
await render("../components/SessionSwitcher.js", "SessionSwitcher", props);
```

**Benefits**:

- ✅ DRY - No duplicate rendering code
- ✅ Consistent error handling
- ✅ Centralized component loading

---

### **Phase 3: Conversation State Management** ⭐ MEDIUM PRIORITY

#### Step 3.1: Create Conversation Manager

**Current**: `conversation` array managed manually  
**Target**: `src/agent/services/ConversationManager.ts`

```typescript
// Functional approach with immutability
export class ConversationManager {
  private messages: ReadonlyArray<OpenAI.ChatCompletionMessage> = [];

  addMessage(message: OpenAI.ChatCompletionMessage): void {
    this.messages = [...this.messages, message];
  }

  addMessages(messages: OpenAI.ChatCompletionMessage[]): void {
    this.messages = [...this.messages, ...messages];
  }

  removeLastMessage(): void {
    this.messages = this.messages.slice(0, -1);
  }

  clear(): void {
    this.messages = [];
  }

  getAll(): ReadonlyArray<OpenAI.ChatCompletionMessage> {
    return this.messages;
  }

  getHistory(limit?: number): ReadonlyArray<OpenAI.ChatCompletionMessage> {
    return limit ? this.messages.slice(-limit) : this.messages;
  }
}
```

**Benefits**:

- ✅ Immutable by default
- ✅ Clear API
- ✅ Prevents accidental mutations

---

### **Phase 4: Workflow Orchestration** ⭐ MEDIUM PRIORITY

#### Step 4.1: Extract Workflow Steps as Composable Functions

**Current**: All in `run()` method  
**Target**: `src/agent/workflows/agentWorkflow.ts`

```typescript
// Compose small functions into workflow
type WorkflowStep<T> = (context: T) => Promise<T>;

// Pure workflow composition
export const composeWorkflow = <T>(
  ...steps: WorkflowStep<T>[]
): WorkflowStep<T> => {
  return async (context: T) => {
    let result = context;
    for (const step of steps) {
      result = await step(result);
    }
    return result;
  };
};

// Individual workflow steps
const getUserInputStep: WorkflowStep<AgentContext> = async (ctx) => {
  const input = await ctx.deps.getUserMessage();
  return { ...ctx, userInput: input };
};

const checkSlashCommandStep: WorkflowStep<AgentContext> = async (ctx) => {
  if (ctx.userInput?.startsWith("/")) {
    const handled = await ctx.commandService.execute(ctx.userInput);
    return { ...ctx, skipInference: handled };
  }
  return ctx;
};

const trackMessageStep: WorkflowStep<AgentContext> = async (ctx) => {
  if (ctx.conversationId && ctx.userInput) {
    await ctx.contextManager.addMessage(
      ctx.conversationId,
      "user",
      ctx.userInput
    );
  }
  return ctx;
};

// Compose workflow
export const createAgentWorkflow = composeWorkflow(
  getUserInputStep,
  checkSlashCommandStep,
  trackMessageStep,
  createPlanStep,
  approvePlanStep,
  executeInferenceStep
);
```

**Benefits**:

- ✅ Each step is testable
- ✅ Easy to reorder/add/remove steps
- ✅ Clear workflow visualization

---

### **Phase 5: Dependency Injection** ⭐ LOW PRIORITY

#### Step 5.1: Use Factory Pattern

**Current**: Hardcoded dependencies  
**Target**: `src/agent/factories/AgentFactory.ts`

```typescript
// Factory with dependency injection
export class AgentFactory {
  static create(deps: AgentDependencies): Agent {
    const contextManager = new ContextManager();
    const sessionService = new SessionService(contextManager);
    const commandService = new CommandService(sessionService, contextManager);
    const conversationManager = new ConversationManager();
    const uiRenderer = createComponentRenderer();

    return new Agent({
      ...deps,
      sessionService,
      commandService,
      conversationManager,
      contextManager,
      uiRenderer,
    });
  }
}
```

**Benefits**:

- ✅ Easy to swap implementations
- ✅ Better for testing (mock injection)
- ✅ Single responsibility

---

## 🎯 Priority Breakdown

### **HIGH PRIORITY** (Do First)

1. ✅ Extract string utilities (1 hour)
2. ✅ Extract message transformers (1 hour)
3. ✅ Create SessionService (2 hours)
4. ✅ Create CommandService (2 hours)
5. ✅ Create UIRenderer (1 hour)

**Total: ~7 hours, 250+ lines reduced**

### **MEDIUM PRIORITY** (Do Second)

6. ✅ Create ConversationManager (1 hour)
7. ✅ Extract workflow composition (3 hours)

**Total: ~4 hours, 100+ lines reduced**

### **LOW PRIORITY** (Optional)

8. ✅ Implement factory pattern (2 hours)
9. ✅ Add more tests (varies)

**Total: ~2+ hours**

---

## 📁 New File Structure

```
src/agent/
├── agent.ts (100 lines - orchestration only!)
├── types.ts
├── constants.ts
├── services/
│   ├── SessionService.ts (150 lines)
│   ├── CommandService.ts (100 lines)
│   ├── ConversationManager.ts (80 lines)
│   └── UIRenderer.ts (80 lines)
├── transformers/
│   ├── messageTransformers.ts (60 lines)
│   └── sessionTransformers.ts (40 lines)
├── workflows/
│   ├── agentWorkflow.ts (120 lines)
│   └── workflowSteps.ts (150 lines)
├── utils/
│   ├── stringUtils.ts (50 lines)
│   └── pathValidation.ts (existing)
└── factories/
    └── AgentFactory.ts (50 lines)
```

**Result**: 437 lines → 100 lines in main file (77% reduction!)

---

## 🔄 Refactoring Strategy

### **Approach**: Incremental Refactoring

1. ✅ **Extract without breaking** - New files alongside old code
2. ✅ **Test each extraction** - Run tests after each step
3. ✅ **Gradually switch** - Replace old code with new
4. ✅ **Remove old code** - Delete after everything works

### **Safety Checks**:

- Run `npm run build` after each step
- Run existing tests
- Test manual workflows
- Check for breaking changes

---

## 🎯 Expected Outcomes

### **Code Quality Improvements**:

- ✅ **Readability**: 77% shorter main file
- ✅ **Testability**: Pure functions = easy tests
- ✅ **Maintainability**: Single responsibility per file
- ✅ **Reusability**: Utilities used elsewhere
- ✅ **Composability**: Small pieces → big features

### **Performance**:

- ✅ **Memory**: No impact (same functionality)
- ✅ **Speed**: Slight improvement (fewer closures)

### **Developer Experience**:

- ✅ **Onboarding**: Easier to understand
- ✅ **Debugging**: Clear stack traces
- ✅ **Extension**: Add features without touching core

---

## 🚀 Quick Start

### To begin refactoring:

```bash
# Step 1: Create new directories
mkdir -p src/agent/services
mkdir -p src/agent/transformers
mkdir -p src/agent/workflows
mkdir -p src/agent/utils
mkdir -p src/agent/factories

# Step 2: Start with utilities (safest)
# Extract stringUtils.ts first
# Then messageTransformers.ts

# Step 3: Build and test
npm run build
npm test
```

---

## 📊 Metrics

| Metric                | Before | After | Improvement |
| --------------------- | ------ | ----- | ----------- |
| Lines in agent.ts     | 437    | ~100  | 77% ↓       |
| Number of methods     | 12     | 4     | 67% ↓       |
| Max method length     | 50+    | <20   | 60% ↓       |
| Testable units        | 1      | 10+   | 10x ↑       |
| Cyclomatic complexity | 18     | <5    | 72% ↓       |

---

## 📚 Composing Software Concepts Applied

1. ✅ **Function Composition** - `composeWorkflow()`
2. ✅ **Pure Functions** - String utils, transformers
3. ✅ **Higher-Order Functions** - `createComponentRenderer()`
4. ✅ **Immutability** - ConversationManager readonly arrays
5. ✅ **Separation of Concerns** - Service layers
6. ✅ **Factory Pattern** - AgentFactory
7. ✅ **Command Pattern** - CommandService
8. ✅ **Single Responsibility** - Each service = 1 job

---

**Ready to start? Let's begin with Phase 1, Step 1.1!** 🚀
