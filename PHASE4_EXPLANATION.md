# Phase 4: Command Pattern for Slash Commands

## 🎯 What We're Doing

We're extracting the **slash command handling** from `agent.ts` into a dedicated **CommandService** using the **Command Pattern**.

## 🤔 Why This Matters

### The Current Problem

Look at our `handleSlashCommand` method (lines 218-240 in agent.ts):

```typescript
private async handleSlashCommand(input: string): Promise<boolean> {
  const command = input.trim();

  switch (command) {
    case "/help":
      await this.showHelp();
      return true;

    case "/sessions":
      await this.showSessionSwitcher();
      return true;

    case "/history":
      await this.showConversationHistory();
      return true;

    default:
      console.log(`Unknown command: ${input}`);
      console.log(`Type /help to see available commands`);
      return true;
  }
}
```

**Problems with this approach:**

1. **Violates Open/Closed Principle**: Every time we add a new command, we modify the switch statement
2. **Hard to Test**: Each command is tightly coupled to the Agent class
3. **No Command History**: Can't log, undo, or track commands
4. **Not Reusable**: Command logic is buried inside Agent class
5. **Growing Responsibility**: Agent class shouldn't know HOW commands work

### The Command Pattern Solution

Think of it like a **restaurant**:

**Current Approach (Switch Statement)**:

```
Customer tells waiter: "I want pasta"
Waiter immediately goes to kitchen and makes pasta themselves
Waiter tells customer: "I want salad"
Waiter immediately goes to kitchen and makes salad themselves
```

Problems:

- Waiter has to know how to cook everything
- Can't track what was ordered
- Can't undo an order
- Can't add new dishes without training all waiters

**Command Pattern Approach**:

```
Customer tells waiter: "I want pasta"
Waiter writes down: PastaOrder
Waiter gives order to kitchen
Kitchen executes: PastaOrder

Customer tells waiter: "I want salad"
Waiter writes down: SaladOrder
Waiter gives order to kitchen
Kitchen executes: SaladOrder
```

Benefits:

- Waiter just takes orders (doesn't cook)
- Kitchen knows how to cook
- Can track all orders
- Can cancel orders
- Easy to add new dishes

## 📚 The Command Pattern

### Definition

**Command Pattern** encapsulates a request as an object, thereby letting you:

- Parameterize clients with different requests
- Queue or log requests
- Support undoable operations

### Structure

```typescript
// 1. Command Interface (the "order slip")
interface Command {
  execute(): Promise<void>;
  getName(): string;
}

// 2. Concrete Commands (specific orders)
class HelpCommand implements Command {
  execute() {
    // Show help
  }
  getName() {
    return "/help";
  }
}

class SessionsCommand implements Command {
  execute() {
    // Show sessions
  }
  getName() {
    return "/sessions";
  }
}

// 3. CommandService (the "waiter")
class CommandService {
  private commands = new Map<string, Command>();

  register(command: Command) {
    this.commands.set(command.getName(), command);
  }

  async execute(commandName: string) {
    const command = this.commands.get(commandName);
    if (command) {
      await command.execute();
    }
  }
}
```

### Key Principles Applied

#### 1. **Single Responsibility Principle (SRP)**

- Each command class has ONE job
- `HelpCommand` only shows help
- `SessionsCommand` only shows sessions
- `HistoryCommand` only shows history

#### 2. **Open/Closed Principle**

- **Open for extension**: Add new commands by creating new classes
- **Closed for modification**: Don't change existing command classes

#### 3. **Dependency Inversion**

- Agent depends on `CommandService` (abstraction)
- Agent doesn't know about specific commands
- Commands can change without affecting Agent

#### 4. **Separation of Concerns**

- Agent: Orchestrates overall flow
- CommandService: Manages and executes commands
- Commands: Implement specific behaviors

## 🔍 Before vs After

### BEFORE: Switch Statement (Current)

```typescript
// agent.ts - 90+ lines of command handling code

private async handleSlashCommand(input: string): Promise<boolean> {
  switch (command) {
    case "/help":
      await this.showHelp();  // 8 lines
      return true;
    case "/sessions":
      await this.showSessionSwitcher();  // 40+ lines
      return true;
    case "/history":
      await this.showConversationHistory();  // 25+ lines
      return true;
    default:
      console.log(`Unknown command: ${input}`);
      return true;
  }
}

private async showHelp() { /* 8 lines */ }
private async showSessionSwitcher() { /* 40+ lines */ }
private async showConversationHistory() { /* 25+ lines */ }
```

**Total in agent.ts**: ~90 lines

**Problems**:

- Agent knows about ALL commands
- Can't add commands without modifying Agent
- Hard to test commands in isolation
- No command history or logging

### AFTER: Command Pattern (Target)

```typescript
// agent.ts - 2 lines!

private async handleSlashCommand(input: string): Promise<boolean> {
  return await this.commandService.execute(input);  // That's it!
}
```

```typescript
// services/CommandService.ts - Clean, focused

export class CommandService {
  private commands = new Map<string, Command>();

  constructor(dependencies: CommandDependencies) {
    // Register all available commands
    this.register(new HelpCommand());
    this.register(new SessionsCommand(dependencies));
    this.register(new HistoryCommand(dependencies));
  }

  register(command: Command) {
    this.commands.set(command.getName(), command);
  }

  async execute(commandName: string): Promise<boolean> {
    const command = this.commands.get(commandName);

    if (!command) {
      console.log(`Unknown command: ${commandName}`);
      console.log(`Type /help to see available commands`);
      return true;
    }

    await command.execute();
    return true;
  }

  getAvailableCommands(): string[] {
    return Array.from(this.commands.keys());
  }
}
```

```typescript
// services/commands/HelpCommand.ts

export class HelpCommand implements Command {
  getName(): string {
    return "/help";
  }

  async execute(): Promise<void> {
    console.log("\n📚 Available Commands:\n");
    console.log("  /help      - Show this help message");
    console.log("  /sessions  - Switch between project sessions");
    console.log("  /history   - View conversation history");
    console.log("");
  }
}
```

**Total in agent.ts**: ~2 lines
**Reduction**: ~88 lines moved to focused command files

## ✨ Benefits of Command Pattern

### 1. **Easy to Add New Commands**

Want to add a `/clear` command?

```typescript
// Just create a new command class
export class ClearCommand implements Command {
  getName() {
    return "/clear";
  }

  async execute() {
    console.clear();
    console.log("✨ Screen cleared!\n");
  }
}

// Register it
commandService.register(new ClearCommand());
```

**No changes needed** to Agent or existing commands!

### 2. **Easy to Test**

```typescript
// Test commands in isolation
const helpCommand = new HelpCommand();
await helpCommand.execute();
// Verify help text was shown
```

### 3. **Command History / Logging**

```typescript
class CommandService {
  private history: Command[] = [];

  async execute(commandName: string) {
    const command = this.commands.get(commandName);
    await command.execute();

    this.history.push(command); // Track what was executed
    console.log(`[LOG] Executed: ${command.getName()}`);
  }

  getHistory() {
    return this.history;
  }
}
```

### 4. **Undo Support** (Future Enhancement)

```typescript
interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>; // Reverse the command!
  getName(): string;
}

class CommandService {
  async undo() {
    const lastCommand = this.history.pop();
    await lastCommand.undo();
  }
}
```

### 5. **Command Queuing** (Future Enhancement)

```typescript
class CommandService {
  private queue: Command[] = [];

  async executeAll() {
    for (const command of this.queue) {
      await command.execute();
    }
  }
}
```

## 📊 Expected Impact

### Code Reduction

| File       | Before    | After      | Reduction             |
| ---------- | --------- | ---------- | --------------------- |
| `agent.ts` | 343 lines | ~255 lines | **~88 lines (25.7%)** |

### Method Simplification

| Method                    | Before   | After   | Change                     |
| ------------------------- | -------- | ------- | -------------------------- |
| `handleSlashCommand`      | 23 lines | 2 lines | **91% reduction**          |
| `showHelp`                | 8 lines  | Removed | Moved to `HelpCommand`     |
| `showSessionSwitcher`     | 48 lines | Removed | Moved to `SessionsCommand` |
| `showConversationHistory` | 25 lines | Removed | Moved to `HistoryCommand`  |

### Total Progress

| Metric           | Original | After Phase 4 | Total Reduction          |
| ---------------- | -------- | ------------- | ------------------------ |
| Lines            | 437      | ~255          | **182 lines (41.6%)**    |
| Methods          | 15+      | ~10           | **5 methods removed**    |
| Responsibilities | 8+       | 4             | **4 concerns extracted** |

## 🎓 Real-World Scenarios

### Scenario 1: Adding a New Command

**Without Command Pattern:**

```typescript
// Have to modify agent.ts
private async handleSlashCommand(input: string) {
  switch (command) {
    case "/help": ...
    case "/sessions": ...
    case "/history": ...
    case "/clear":  // NEW - modify switch!
      console.clear();
      return true;
    // ... test ALL commands again
  }
}
```

**With Command Pattern:**

```typescript
// Just create new file: commands/ClearCommand.ts
export class ClearCommand implements Command {
  getName() {
    return "/clear";
  }
  async execute() {
    console.clear();
  }
}

// Register it (one line)
commandService.register(new ClearCommand());

// Done! No changes to existing code
```

### Scenario 2: Debugging a Command

**Without Command Pattern:**

- Commands are methods in 343-line Agent class
- Hard to isolate what went wrong
- Have to understand entire Agent to fix one command

**With Command Pattern:**

- Each command is isolated 10-30 line file
- Test command independently
- Fix without touching anything else

### Scenario 3: Command Analytics

**Without Command Pattern:**

```typescript
// Have to add logging to each case
case "/help":
  console.log("[ANALYTICS] Help viewed");
  await this.showHelp();
  // ... repeat for each command
```

**With Command Pattern:**

```typescript
// Add logging in ONE place
async execute(commandName: string) {
  const command = this.commands.get(commandName);
  await command.execute();

  // Centralized analytics for ALL commands
  this.analytics.track(command.getName());
}
```

## 🏗️ Implementation Plan

### Step 1: Create Command Interface

```typescript
// services/commands/types.ts
export interface Command {
  getName(): string;
  execute(): Promise<void>;
}

export interface CommandDependencies {
  uiRenderer: UIRenderer;
  contextManager: ContextManager;
  sessionService: SessionService;
  currentConversationId: string | null;
}
```

### Step 2: Create Command Classes

```typescript
// services/commands/HelpCommand.ts
// services/commands/SessionsCommand.ts
// services/commands/HistoryCommand.ts
```

### Step 3: Create CommandService

```typescript
// services/CommandService.ts
export class CommandService {
  private commands = new Map<string, Command>();

  constructor(dependencies: CommandDependencies) {
    this.register(new HelpCommand());
    this.register(new SessionsCommand(dependencies));
    this.register(new HistoryCommand(dependencies));
  }

  async execute(commandName: string): Promise<boolean> { ... }
}
```

### Step 4: Simplify Agent

```typescript
// agent.ts
private commandService: CommandService;

constructor(deps: AgentDependencies) {
  // ...
  this.commandService = new CommandService({
    uiRenderer: this.uiRenderer,
    contextManager: this.contextManager,
    sessionService: this.sessionService,
    currentConversationId: () => this.currentConversationId,
  });
}

private async handleSlashCommand(input: string): Promise<boolean> {
  return await this.commandService.execute(input);
}

// Delete: showHelp, showSessionSwitcher, showConversationHistory
```

## 🧪 Testing Strategy

### Unit Tests for Each Command

```typescript
// test-commands.ts
const helpCommand = new HelpCommand();
console.log("Testing HelpCommand...");
await helpCommand.execute();
// Verify help text shown

const sessionsCommand = new SessionsCommand(mockDeps);
console.log("Testing SessionsCommand...");
await sessionsCommand.execute();
// Verify sessions UI shown
```

### Integration Test for CommandService

```typescript
const service = new CommandService(deps);

console.log("Testing command registration...");
assert(service.getAvailableCommands().includes("/help"));

console.log("Testing command execution...");
await service.execute("/help");
// Verify help shown

console.log("Testing unknown command...");
await service.execute("/unknown");
// Verify error message
```

## 🎯 Key Takeaways

1. **Command Pattern**: Turn requests into objects
2. **Open/Closed**: Add features without modifying existing code
3. **SRP**: One command, one responsibility
4. **Testability**: Test commands independently
5. **Flexibility**: Easily add undo, logging, queuing

## 🚀 Next Steps

1. Create command interface and types
2. Extract each command into its own class
3. Create CommandService
4. Update Agent to use CommandService
5. Test all commands work correctly
6. Verify ~88 line reduction

---

**Remember**: Good architecture makes future changes easy. The Command Pattern makes adding new commands trivial!
