# Phase 3: Session Service - Explanation 🗂️

## 🔍 The Problem We're Solving

Look at the session-related code scattered throughout `agent.ts`:

### Session Code is Everywhere:

```typescript
class Agent {
  // Session state (mixed with other state)
  private sessionId: string | null = null;
  private currentConversationId: string | null = null;

  // Session initialization (94 lines!)
  private async initializeSession(): Promise<void> {
    const projectPath = process.cwd();
    const sessions = await this.contextManager.listSessions();
    const existingSession = sessions.find(s => s.project === projectPath);

    if (existingSession) {
      // ... 30 lines of loading logic
    } else {
      // ... 20 lines of creation logic
    }
  }

  // Session auto-naming (47 lines!)
  private async autoNameSession(firstMessage: string): Promise<void> {
    // Check if first message
    const messages = await this.contextManager.getConversationMessages(...);
    if (messages.length !== 1) return;

    // Get current session
    const sessions = await this.contextManager.listSessions();
    const currentSession = sessions.find(s => s.id === this.sessionId);

    // ... more logic
  }

  // Session switching (embedded in showSessionSwitcher - 45 lines!)
  onSessionChange: async (sessionId: string) => {
    await this.contextManager.loadSession(sessionId);
    this.sessionId = sessionId;

    const sessions = await this.contextManager.listSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (session) {
      this.currentConversationId = session.currentConversationId;
      this.conversation = [];

      const messages = await this.contextManager.getConversationMessages(...);
      for (const msg of messages) {
        this.conversation.push({ role: msg.role, content: msg.content });
      }
    }
  }
}
```

### ❌ The Problems:

1. **Violates Single Responsibility** - Agent handles sessions AND conversation AND planning AND execution
2. **Mixed Abstractions** - Session logic scattered across multiple methods
3. **Hard to Test** - Can't test session logic without full Agent instance
4. **Hard to Reuse** - Session logic trapped in Agent class
5. **Tight Coupling** - Agent knows TOO MUCH about how sessions work
6. **Duplicate Code** - Fetching sessions list repeated 3+ times

**Current**: ~186 lines of session logic mixed throughout agent.ts  
**After Phase 3**: ~20 lines in agent.ts + 1 clean SessionService

---

## 🎓 Principles We'll Apply

### 1. Single Responsibility Principle (SRP) 🔷

**What is it?** (from our teaching doc)

> "A module, class, or function should have one, and only one, reason to change."

**The Swiss Army Knife vs Chef's Knife Analogy**:

- ❌ **Swiss Army knife**: Many tools in one (convenient but awkward)
- ✅ **Chef's knife**: One job, does it perfectly

**How we'll apply it**:

**Before (Agent has TOO MANY responsibilities)**:

```
Agent's Jobs:
1. Orchestrate conversation flow ✓
2. Manage planning ✓
3. Execute tools ✓
4. Manage sessions ✗ (Should be separate!)
5. Handle commands ✗ (Should be separate!)
6. Render UI ✗ (Already extracted!)
```

**After (Each class has ONE job)**:

```
Agent: Orchestrate the workflow
SessionService: Manage sessions
UIRenderer: Handle UI rendering
CommandService: Process commands (Phase 4)
```

**Why it's better**:

- ✅ Need to change session logic? Only touch SessionService
- ✅ Need to change conversation logic? Only touch Agent
- ✅ Each module has ONE reason to change
- ✅ Easier to understand what each module does

### 2. Abstraction 🛡️

**What is it?** (from our teaching doc)

> "Abstraction hides complexity behind a simpler interface."

**The Car Driving Analogy**:

- You don't need to know how the engine works
- You just use: steering wheel, gas pedal, brakes
- Complex internals are hidden

**How we'll apply it**:

**Before (Agent knows TOO MUCH about sessions)**:

```typescript
// Agent has to know:
// - How to query session list
// - How to check for existing sessions
// - How to create new sessions
// - How to load sessions
// - How to update session names
// - How to restore conversation from session

private async initializeSession(): Promise<void> {
  const sessions = await this.contextManager.listSessions(); // Agent knows DB!
  const existing = sessions.find(s => s.project === projectPath); // Agent knows structure!

  if (existing) {
    this.sessionId = existing.id;
    await this.contextManager.loadSession(this.sessionId); // Agent knows loading!
    // ... 30 more lines of implementation details
  }
}
```

**After (Agent only knows WHAT, not HOW)**:

```typescript
// Agent just calls simple methods:
private async initializeSession(): Promise<void> {
  const session = await this.sessionService.initializeForProject(process.cwd());
  this.sessionId = session.id;
  this.currentConversationId = session.currentConversationId;
  // SessionService handles ALL the complexity!
}
```

**Why it's better**:

- ✅ Agent doesn't need to know HOW sessions are stored
- ✅ Can change session storage (SQLite → Redis) without touching Agent
- ✅ Simple, clear interface: `initializeForProject()`, `autoName()`, `switchTo()`
- ✅ Complexity hidden inside SessionService

### 3. Encapsulation 🛡️

**What is it?** (from our teaching doc)

> "Encapsulation keeps related data and operations bundled together and prevents external code from depending on internal details."

**How we'll apply it**:

**Before (Session state exposed)**:

```typescript
class Agent {
  private sessionId: string | null = null; // Exposed to Agent
  private currentConversationId: string | null = null; // Exposed to Agent

  // Agent manipulates session state directly
  async handleSessionSwitch(newSessionId: string) {
    this.sessionId = newSessionId; // Direct manipulation!
    this.currentConversationId = ...; // Direct manipulation!
  }
}
```

**After (Session state encapsulated)**:

```typescript
class SessionService {
  private currentSession: Session | null = null; // Private! Hidden!

  // Only SessionService can change session state
  async switchTo(sessionId: string): Promise<Session> {
    this.currentSession = await this.loadSession(sessionId);
    return this.currentSession; // Agent gets result, not internal state
  }
}

class Agent {
  // Agent just uses the service
  async handleSessionSwitch(sessionId: string) {
    const session = await this.sessionService.switchTo(sessionId);
    // Agent gets what it needs, doesn't manipulate internals
  }
}
```

**Why it's better**:

- ✅ Session state is private to SessionService
- ✅ Can't accidentally corrupt session data
- ✅ Easier to add validation, caching, etc.
- ✅ Clear API boundary

### 4. Dependency Injection 💉

**What is it?**

> "Pass dependencies to a class instead of creating them inside the class."

**How we'll apply it**:

**Before (Agent creates its own dependencies)**:

```typescript
class Agent {
  private contextManager: ContextManager;

  constructor(deps: AgentDependencies) {
    this.contextManager = new ContextManager(); // Created inside!
  }
}
```

**After (Dependencies injected)**:

```typescript
class SessionService {
  constructor(
    private contextManager: ContextManager, // Injected!
    private stringUtils: typeof import("./utils/stringUtils")
  ) {}
}

class Agent {
  private sessionService: SessionService;

  constructor(deps: AgentDependencies) {
    const contextManager = new ContextManager();
    this.sessionService = new SessionService(contextManager); // Inject!
  }
}
```

**Why it's better**:

- ✅ Easy to test (inject mocks)
- ✅ Easy to swap implementations
- ✅ Clear dependencies visible in constructor
- ✅ Follows Dependency Inversion Principle

---

## 🏗️ What We'll Build

### New File: `src/agent/services/SessionService.ts`

This service will handle ALL session management.

**Structure**:

```typescript
export class SessionService {
  private currentSession: Session | null = null;

  constructor(private contextManager: ContextManager) {}

  /**
   * Initialize session for a project
   * Loads existing or creates new session
   */
  async initializeForProject(projectPath: string): Promise<Session> {
    // All the complex logic hidden here!
    const sessions = await this.contextManager.listSessions();
    const existing = sessions.find((s) => s.project === projectPath);

    if (existing) {
      return await this.loadExisting(existing.id);
    } else {
      return await this.createNew(projectPath);
    }
  }

  /**
   * Auto-name session from first message
   */
  async autoName(conversationId: string, firstMessage: string): Promise<void> {
    // Check if should auto-name
    // Generate name
    // Update session
  }

  /**
   * Switch to a different session
   */
  async switchTo(sessionId: string): Promise<Session> {
    await this.contextManager.loadSession(sessionId);
    this.currentSession = await this.getSession(sessionId);
    return this.currentSession;
  }

  /**
   * Get conversation messages for current session
   */
  async getConversationMessages(limit?: number): Promise<Message[]> {
    if (!this.currentSession?.currentConversationId) return [];
    return await this.contextManager.getConversationMessages(
      this.currentSession.currentConversationId,
      limit
    );
  }

  // Helper methods (private)
  private async loadExisting(sessionId: string): Promise<Session> {}
  private async createNew(projectPath: string): Promise<Session> {}
  private async getSession(sessionId: string): Promise<Session> {}
}
```

**Usage in Agent (Simple!)**:

```typescript
class Agent {
  private sessionService: SessionService;

  async initializeSession() {
    const session = await this.sessionService.initializeForProject(
      process.cwd()
    );
    this.sessionId = session.id;
    this.currentConversationId = session.currentConversationId;
  }

  async handleUserInput(input: string) {
    // Auto-name from first message
    await this.sessionService.autoName(this.currentConversationId!, input);
  }

  async switchSession(sessionId: string) {
    const session = await this.sessionService.switchTo(sessionId);
    this.sessionId = session.id;
    this.currentConversationId = session.currentConversationId;

    // Restore conversation
    const messages = await this.sessionService.getConversationMessages(20);
    this.conversation = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }
}
```

---

## 📊 Expected Impact

### Before Phase 3:

- **agent.ts**: 388 lines
- **Session logic**: Scattered across 3+ methods (~186 lines)
- **initializeSession**: 94 lines
- **autoNameSession**: 47 lines
- **Session switching**: ~45 lines embedded in UI callback

### After Phase 3:

- **agent.ts**: ~300 lines (**~88 lines removed**, 23% reduction!)
- **SessionService**: ~150 lines (encapsulated, testable)
- **initializeSession**: ~5 lines (just calls service)
- **autoNameSession**: ~1 line (delegates to service)
- **Session switching**: ~8 lines (uses service)

### Code Reduction:

- **Direct reduction**: 88 lines from agent.ts
- **Testability**: Can test session logic in isolation
- **Reusability**: Other parts of app can use SessionService
- **Maintainability**: All session logic in ONE place

---

## 🎯 Step-by-Step Plan

### Step 1: Create SessionService ✅

- Create `src/agent/services/SessionService.ts`
- Apply SRP: ONLY session management
- Encapsulate session state
- Provide clean abstraction

### Step 2: Extract initializeSession Logic ✅

- Move `initializeSession()` logic to service
- Simplify Agent method to just call service
- Test it works

### Step 3: Extract autoNameSession Logic ✅

- Move `autoNameSession()` logic to service
- Update Agent to delegate
- Test it works

### Step 4: Extract Session Switching Logic ✅

- Create `switchTo()` method in service
- Update `showSessionSwitcher` callback
- Test session switching works

### Step 5: Test & Verify ✅

- Build the project
- Run manual tests
- Verify all session operations work
- No regressions

---

## 💡 Why This Matters

### For You (The Intern):

**Imagine maintaining this code in 6 months:**

**Before (scattered logic)**:

- Bug in session loading? 😰 Where is that code? Agent.ts? Which method? Line 200? 300?
- Need to add session feature? 😰 Have to understand all of Agent class
- Want to test sessions? 😰 Need to mock entire Agent

**After (clean service)**:

- Bug in session loading? 😊 Look in SessionService.ts
- Need to add session feature? 😊 Add to SessionService
- Want to test sessions? 😊 Test SessionService directly

### Real-World Benefits:

1. **Team Collaboration** 👥

   - Different people can work on Agent vs SessionService
   - No merge conflicts
   - Clear ownership

2. **Debugging** 🐛

   - Session bug? Search SessionService only
   - Clear stack traces
   - Easy to add logging in one place

3. **Feature Development** 🚀

   - Want session expiration? Add to SessionService
   - Want session sharing? Modify SessionService
   - Agent doesn't need to change!

4. **Testing** 🧪
   - Mock SessionService for Agent tests
   - Test SessionService with mock ContextManager
   - Isolated, focused tests

---

## 🔑 Key Concepts Summary

| Principle                | What It Means                | Why It Helps                     |
| ------------------------ | ---------------------------- | -------------------------------- |
| **SRP**                  | One class = one job          | Easier to change and understand  |
| **Abstraction**          | Hide complexity              | Agent doesn't need to know HOW   |
| **Encapsulation**        | Bundle related data/behavior | Can't accidentally corrupt state |
| **Dependency Injection** | Pass in dependencies         | Easy to test and swap            |

---

## 🚀 Ready to Implement!

Let's create the SessionService and refactor agent.ts!

**What you'll learn**:

- How to identify a "concern" that should be extracted
- How to design a clean service API
- How to migrate logic incrementally
- How to maintain functionality while refactoring
