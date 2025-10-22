# Composing Software Concepts - Teaching Guide 📚

**For**: Learning functional programming and composable software design  
**Source**: "Composing Software" by Eric Elliott  
**Goal**: Understand WHY and HOW to write better, more maintainable code

---

## 🎓 Welcome, Developer!

This guide will teach you the key concepts from "Composing Software" that we're applying to refactor our agent.ts file. Each section explains:

1. **What** the concept is
2. **Why** it matters
3. **How** to apply it
4. **Real examples** from our codebase

Think of this as your mentorship handbook. Let's learn together! 🚀

---

## Table of Contents

1. [Pure Functions](#1-pure-functions-)
2. [Function Composition](#2-function-composition-)
3. [Immutability](#3-immutability-)
4. [Higher-Order Functions](#4-higher-order-functions-)
5. [Currying & Partial Application](#5-currying--partial-application-)
6. [Separation of Concerns](#6-separation-of-concerns-)
7. [Single Responsibility Principle](#7-single-responsibility-principle-)
8. [Factory Pattern](#8-factory-pattern-)
9. [Command Pattern](#9-command-pattern-)
10. [Abstraction & Encapsulation](#10-abstraction--encapsulation-)

---

## 1. Pure Functions 🔵

### What is it?

**Definition from Eric Elliott**:

> "A pure function is a function which:
>
> 1. Given the same inputs, always returns the same output
> 2. Has no side-effects"

### Breaking it down for beginners:

Imagine a vending machine:

- You put in $1.50 → You get a soda (always!)
- Pure function = predictable vending machine
- Impure function = vending machine that sometimes gives you candy instead, or charges your credit card randomly

### The Two Rules:

**Rule 1: Same Input → Same Output** (Deterministic)

```typescript
// ✅ PURE: Always returns same result
const add = (a: number, b: number): number => {
  return a + b;
};

add(2, 3); // 5
add(2, 3); // 5 (always 5!)

// ❌ IMPURE: Returns different results
const addRandom = (a: number): number => {
  return a + Math.random(); // Random! Unpredictable!
};

addRandom(2); // 2.7
addRandom(2); // 2.3 (different each time!)
```

**Rule 2: No Side Effects**

Side effects are when a function changes something outside itself:

- Modifying a variable outside the function
- Logging to console
- Writing to a file
- Modifying the DOM
- Making API calls
- Mutating input parameters

```typescript
// ❌ IMPURE: Has side effects
let total = 0; // Outside variable

const addToTotal = (amount: number): void => {
  total += amount; // Side effect #1: Modifies outside variable
  console.log(total); // Side effect #2: Console output
  saveToDatabase(total); // Side effect #3: I/O operation
};

// ✅ PURE: No side effects
const calculateTotal = (currentTotal: number, amount: number): number => {
  return currentTotal + amount; // Just math, no changes outside
};

// Caller decides what to do with result
const newTotal = calculateTotal(total, 50);
console.log(newTotal); // Caller does the side effect
```

### Why Pure Functions Are Better:

#### 1. **Easy to Test** 🧪

```typescript
// ❌ IMPURE: Hard to test
class UserService {
  private db = new Database();

  updateUser(id: string, name: string) {
    this.db.update(id, { name }); // Need to mock database!
    console.log("Updated"); // Logs pollute test output
  }
}

// Test is painful:
test("updateUser", () => {
  const mockDb = createMockDatabase(); // Setup pain
  const service = new UserService();
  service.db = mockDb; // Need to inject mock
  service.updateUser("1", "John");
  expect(mockDb.update).toHaveBeenCalled(); // Complex assertion
});

// ✅ PURE: Easy to test
const createUpdateData = (name: string) => ({
  name,
  updatedAt: new Date().toISOString(),
});

// Test is simple:
test("createUpdateData", () => {
  const result = createUpdateData("John");
  expect(result.name).toBe("John"); // Simple! No mocks needed!
});
```

#### 2. **Easy to Debug** 🐛

```typescript
// ❌ IMPURE: Bug hunting is hard
let userCount = 0;

function processUser(user) {
  userCount++; // Who else modifies this?
  updateDatabase(user); // What if this fails?
  if (someGlobalState.premium) {
    // Hidden dependency!
    sendEmail(user);
  }
}

// Bug: "userCount is wrong!"
// Where to look?
// - processUser?
// - Other functions that modify userCount?
// - Race conditions?

// ✅ PURE: Bug is isolated
const countUsers = (currentCount: number): number => {
  return currentCount + 1;
};

const shouldSendEmail = (isPremium: boolean): boolean => {
  return isPremium;
};

// Bug: "count is wrong!"
// Only one place to look: countUsers function!
```

#### 3. **Memoizable** (Cacheable) 💾

```typescript
// Pure functions can cache results
const memoize = (fn) => {
  const cache = new Map();

  return (...args) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key); // Return cached result!
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

// ✅ PURE: Can be memoized
const expensiveCalculation = (n: number): number => {
  // Simulate expensive operation
  let result = 0;
  for (let i = 0; i < n; i++) {
    result += Math.sqrt(i);
  }
  return result;
};

const memoized = memoize(expensiveCalculation);

memoized(1000000); // Takes 100ms (calculates)
memoized(1000000); // Takes 0.1ms (cached!)
```

#### 4. **Parallelizable** ⚡

```typescript
// Pure functions are safe to run in parallel
const numbers = [1, 2, 3, 4, 5, 6, 7, 8];

// ✅ PURE: Safe to parallelize
const double = (n: number): number => n * 2;

// Can run in parallel workers (no shared state!)
const results = await Promise.all(numbers.map((n) => runInWorker(double, n)));

// ❌ IMPURE: NOT safe to parallelize
let sum = 0;
const addToSum = (n: number) => {
  sum += n; // Race condition! Multiple threads accessing sum!
};
```

### Real Example from Our Codebase:

**BEFORE (Impure)**:

```typescript
// src/agent/agent.ts (BEFORE)
class Agent {
  private conversation: Message[] = []; // Shared mutable state

  private extractFileReferences(content: string): string[] {
    const matches = content.match(/@([^\s]+)/g) || [];
    const refs = matches.map((m) => m.substring(1));

    // Side effect: Modifies instance variable
    this.lastExtractedRefs = refs;

    // Side effect: Logs to console
    console.log(`Extracted ${refs.length} file references`);

    // Side effect: Tracks in analytics
    this.analytics.track("file_references_extracted", refs.length);

    return refs;
  }
}

// Problems:
// 1. Hard to test (need Agent instance)
// 2. Has side effects (logging, analytics, state mutation)
// 3. Can't memoize (side effects break caching)
```

**AFTER (Pure)**:

```typescript
// src/agent/utils/stringUtils.ts (AFTER)

// ✅ PURE: Just string transformation
export const extractFileReferences = (content: string): string[] => {
  const matches = content.match(/@([^\s]+)/g) || [];
  return matches.map((m) => m.substring(1));
};

// Why this is better:

// 1. Easy to test (no dependencies)
test("extractFileReferences", () => {
  expect(extractFileReferences("@file.ts hello @test.js")).toEqual([
    "file.ts",
    "test.js",
  ]);
});

// 2. Can be used anywhere
import { extractFileReferences } from "./stringUtils";
const refs = extractFileReferences(userInput);

// 3. Can be memoized for performance
const memoizedExtract = memoize(extractFileReferences);

// 4. Side effects moved to caller (explicit!)
const refs = extractFileReferences(content);
console.log(`Found ${refs.length} references`); // Caller decides to log
analytics.track("refs_extracted", refs.length); // Caller decides to track
```

### Key Takeaway:

**"Push side effects to the edges of your program. Keep the core logic pure."**

Think of your program like an onion:

- 🎯 **Center (80%)**: Pure functions (business logic)
- 🧅 **Outer layer (20%)**: Side effects (I/O, state changes)

```
┌─────────────────────────────────┐
│   Side Effects Layer (I/O)     │
│  ┌─────────────────────────┐   │
│  │   Pure Functions        │   │
│  │   (Business Logic)      │   │
│  │   - Easy to test        │   │
│  │   - Predictable         │   │
│  │   - Reusable            │   │
│  └─────────────────────────┘   │
│  (DB, API, Console, File)      │
└─────────────────────────────────┘
```

### Practice Exercise:

Make this function pure:

```typescript
// ❌ IMPURE
let discount = 0.1;

function calculatePrice(price: number): number {
  const discounted = price * (1 - discount);
  console.log(`Price: $${discounted}`);
  return Math.round(discounted);
}

// ✅ YOUR TASK: Make it pure!
// Hint: Pass discount as parameter, remove console.log, return exact number
```

<details>
<summary>Solution</summary>

```typescript
// ✅ PURE
const calculatePrice = (price: number, discount: number): number => {
  return price * (1 - discount);
};

// Usage (side effects at call site):
const discount = 0.1;
const finalPrice = calculatePrice(100, discount);
console.log(`Price: $${Math.round(finalPrice)}`);
```

</details>

---

## 2. Function Composition 🟢

### What is it?

**Definition from Eric Elliott**:

> "Function composition is the process of combining two or more functions to produce a new function. Composing functions together is like snapping together a series of pipes for our data to flow through."

### The Intuition:

Think of building with LEGO blocks:

- Each LEGO piece = a small function
- Snapping pieces together = function composition
- Final creation = composed function

Or think of a factory assembly line:

- Station 1: Cut metal → `cut(metal)`
- Station 2: Shape parts → `shape(parts)`
- Station 3: Paint → `paint(shaped)`
- Station 4: Assemble → `assemble(painted)`

Instead of one huge machine, you have small specialized stations working together!

### Simple Example:

```typescript
// Three simple functions
const addOne = (x: number): number => x + 1;
const double = (x: number): number => x * 2;
const square = (x: number): number => x * x;

// ❌ WITHOUT composition: Nested, hard to read (right to left)
const result = square(double(addOne(5)));
// What's happening? 5 → 6 → 12 → 144
// Hard to read inside-out!

// ✅ WITH composition: Clear pipeline (left to right)
const compose =
  (...fns) =>
  (x) =>
    fns.reduceRight((v, f) => f(v), x);
const pipe =
  (...fns) =>
  (x) =>
    fns.reduce((v, f) => f(v), x);

// Using pipe (left-to-right, easier to read!)
const transform = pipe(
  addOne, // 5 → 6
  double, // 6 → 12
  square // 12 → 144
);

const result = transform(5); // 144

// Clear data flow! Read like a recipe: add one, then double, then square
```

### Why Function Composition Is Better:

#### 1. **Readability** - Clear Data Flow 📖

```typescript
// ❌ WITHOUT composition: Procedural nightmare
function processUser(user) {
  // Step 1: Validate
  if (!user.email) throw new Error("No email");
  if (!user.name) throw new Error("No name");

  // Step 2: Normalize
  const normalized = {
    ...user,
    email: user.email.toLowerCase().trim(),
    name: user.name.trim(),
  };

  // Step 3: Add metadata
  const withMeta = {
    ...normalized,
    id: generateId(),
    createdAt: new Date(),
  };

  // Step 4: Format for API
  const formatted = {
    email: withMeta.email,
    name: withMeta.name,
    id: withMeta.id,
    created_at: withMeta.createdAt.toISOString(),
  };

  return formatted;
}

// Hard to see the big picture!

// ✅ WITH composition: Crystal clear pipeline
const processUser = pipe(
  validateUser, // User → ValidUser
  normalizeUser, // ValidUser → NormalizedUser
  addMetadata, // NormalizedUser → UserWithMeta
  formatForAPI // UserWithMeta → APIUser
);

// The steps are right there! Easy to understand the flow.
```

#### 2. **Modularity** - Reuse Components 🔧

```typescript
// Each function is reusable
const validateUser = (user) => {
  if (!user.email) throw new Error("No email");
  if (!user.name) throw new Error("No name");
  return user;
};

const normalizeEmail = (user) => ({
  ...user,
  email: user.email.toLowerCase().trim(),
});

const normalizeName = (user) => ({
  ...user,
  name: user.name.trim(),
});

const addTimestamp = (user) => ({
  ...user,
  createdAt: new Date(),
});

// Compose different pipelines from same pieces!

// Pipeline 1: Full registration
const registerUser = pipe(
  validateUser,
  normalizeEmail,
  normalizeName,
  addTimestamp,
  saveToDatabase
);

// Pipeline 2: Quick update (skip validation)
const updateUser = pipe(normalizeEmail, normalizeName, saveToDatabase);

// Pipeline 3: Just validation
const checkUser = pipe(validateUser);

// Same building blocks, different combinations! Like LEGO!
```

#### 3. **Testability** - Test Each Piece 🧪

```typescript
// Each small function is easily testable
test("validateUser throws on missing email", () => {
  expect(() => validateUser({ name: "John" })).toThrow("No email");
});

test("normalizeEmail lowercases email", () => {
  expect(normalizeEmail({ email: "JOHN@EXAMPLE.COM" })).toEqual({
    email: "john@example.com",
  });
});

test("addTimestamp adds createdAt", () => {
  const result = addTimestamp({ email: "test@test.com" });
  expect(result.createdAt).toBeInstanceOf(Date);
});

// Test the whole pipeline
test("processUser works end-to-end", () => {
  const input = { email: "JOHN@EXAMPLE.COM ", name: " John Doe " };
  const result = processUser(input);

  expect(result.email).toBe("john@example.com");
  expect(result.name).toBe("John Doe");
  expect(result.createdAt).toBeDefined();
});

// Easy! Each piece tested individually, then test composition!
```

#### 4. **Maintainability** - Change One Piece 🛠️

```typescript
// Need to add a new step? Easy!
const processUser = pipe(
  validateUser,
  normalizeUser,
  addMetadata,
  sanitizeHTML, // ← NEW! Just add to pipeline
  formatForAPI
);

// Need to remove a step? Easy!
const processUser = pipe(
  validateUser,
  normalizeUser,
  // addMetadata,     ← REMOVED! Just comment out
  formatForAPI
);

// Need to reorder? Easy!
const processUser = pipe(
  normalizeUser, // ← Moved up
  validateUser, // ← Moved down
  addMetadata,
  formatForAPI
);
```

### Real Example from Our Codebase:

**BEFORE (No Composition)**:

```typescript
// src/agent/agent.ts (BEFORE)
class Agent {
  private async handleUserInput(): Promise<boolean> {
    // Everything in one method (50+ lines!)
    const userInput = await this.deps.getUserMessage();

    if (userInput.startsWith("/")) {
      const handled = await this.handleSlashCommand(userInput);
      if (handled) return false;
    }

    const userMessage = { role: "user", content: userInput };
    this.conversation.push(userMessage);

    if (this.currentConversationId) {
      const fileReferences = this.extractFileReferences(userInput);
      await this.contextManager.addMessage(
        this.currentConversationId,
        "user",
        userInput,
        { fileReferences }
      );
      await this.autoNameSession(userInput);
    }

    const plan = await createPlan(this.deps.client, this.conversation);

    if (plan) {
      const planApproved = await this.handlePlanApproval(plan);
      if (!planApproved) {
        this.deps.showAgentMessage("Plan rejected.");
        this.conversation.pop();
        return false;
      }
    }

    return true;
  }
}

// Problems:
// 1. One giant method (hard to understand)
// 2. Steps are mixed together (hard to test)
// 3. Can't reuse steps (tightly coupled)
// 4. Hard to modify (change one thing, break everything)
```

**AFTER (With Composition)**:

```typescript
// src/agent/workflows/agentWorkflow.ts (AFTER)

// Define workflow steps (each is a small, focused function)
type WorkflowStep<T> = (context: T) => Promise<T>;

// Step 1: Get user input
const getUserInputStep: WorkflowStep<AgentContext> = async (ctx) => {
  const input = await ctx.deps.getUserMessage();
  return { ...ctx, userInput: input };
};

// Step 2: Check for slash commands
const checkSlashCommandStep: WorkflowStep<AgentContext> = async (ctx) => {
  if (ctx.userInput?.startsWith('/')) {
    const handled = await ctx.commandService.execute(ctx.userInput);
    return { ...ctx, skipInference: handled };
  }
  return ctx;
};

// Step 3: Add to conversation
const addToConversationStep: WorkflowStep<AgentContext> = async (ctx) => {
  if (ctx.skipInference) return ctx;

  const message = { role: 'user', content: ctx.userInput };
  ctx.conversationManager.addMessage(message);
  return ctx;
};

// Step 4: Track in database
const trackMessageStep: WorkflowStep<AgentContext> = async (ctx) => {
  if (ctx.skipInference || !ctx.conversationId) return ctx;

  await ctx.contextManager.addMessage(
    ctx.conversationId,
    'user',
    ctx.userInput!
  );
  return ctx;
};

// Step 5: Auto-name session
const autoNameSessionStep: WorkflowStep<AgentContext> = async (ctx) => {
  if (ctx.skipInference || !ctx.conversationId) return ctx;

  await ctx.sessionService.autoNameSession(
    ctx.sessionId,
    ctx.userInput!
  );
  return ctx;
};

// Step 6: Create plan
const createPlanStep: WorkflowStep<AgentContext> = async (ctx) => {
  if (ctx.skipInference) return ctx;

  const plan = await createPlan(ctx.deps.client, ctx.conversation);
  return { ...ctx, plan };
};

// Step 7: Approve plan
const approvePlanStep: WorkflowStep<AgentContext> = async (ctx) => {
  if (ctx.skipInference || !ctx.plan) return ctx;

  const approved = await ctx.deps.getPlanApproval(ctx.plan);
  if (!approved) {
    ctx.conversationManager.removeLastMessage();
    return { ...ctx, skipInference: true };
  }
  return ctx;
};

// Compose workflow (like assembly line!)
const composeWorkflow = <T>(
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

// Create the pipeline
export const createUserInputWorkflow = composeWorkflow(
  getUserInputStep,
  checkSlashCommandStep,
  addToConversationStep,
  trackMessageStep,
  autoNameSessionStep,
  createPlanStep,
  approvePlanStep
);

// Usage in Agent:
private async handleUserInput(): Promise<boolean> {
  const context = {
    deps: this.deps,
    conversationManager: this.conversationManager,
    sessionService: this.sessionService,
    // ... other dependencies
  };

  const result = await createUserInputWorkflow(context);
  return !result.skipInference;
}

// Benefits:
// ✅ Each step is testable individually
// ✅ Easy to add/remove/reorder steps
// ✅ Clear workflow visualization
// ✅ Steps can be reused in other workflows
// ✅ Much easier to understand!
```

### Visual Comparison:

```
BEFORE: Giant monolithic function
┌────────────────────────────────────┐
│  handleUserInput()                │
│  ├─ Get input                     │
│  ├─ Check slash commands          │
│  ├─ Add to conversation           │
│  ├─ Track in DB                   │
│  ├─ Auto-name session             │
│  ├─ Create plan                   │
│  └─ Approve plan                  │
│  (50+ lines, all mixed together)  │
└────────────────────────────────────┘

AFTER: Composed pipeline
┌──────────────────┐
│ getUserInput     │ ─┐
└──────────────────┘  │
                      ├→ composeWorkflow()
┌──────────────────┐  │
│ checkCommand     │ ─┤
└──────────────────┘  │
                      ├→ Clean data flow!
┌──────────────────┐  │
│ addToConversation│ ─┤
└──────────────────┘  │
                      │
┌──────────────────┐  │
│ trackMessage     │ ─┤
└──────────────────┘  │
                      │
┌──────────────────┐  │
│ autoNameSession  │ ─┤
└──────────────────┘  │
                      │
┌──────────────────┐  │
│ createPlan       │ ─┤
└──────────────────┘  │
                      │
┌──────────────────┐  │
│ approvePlan      │ ─┘
└──────────────────┘
```

### Helper Functions for Composition:

```typescript
// compose: Right-to-left composition
const compose =
  <T>(...fns: Array<(arg: T) => T>) =>
  (x: T): T =>
    fns.reduceRight((v, f) => f(v), x);

// Usage: compose(c, b, a)(x) === c(b(a(x)))
const transform = compose(square, double, addOne);
transform(5); // square(double(addOne(5)))

// pipe: Left-to-right composition (more intuitive!)
const pipe =
  <T>(...fns: Array<(arg: T) => T>) =>
  (x: T): T =>
    fns.reduce((v, f) => f(v), x);

// Usage: pipe(a, b, c)(x) === c(b(a(x)))
const transform = pipe(addOne, double, square);
transform(5); // square(double(addOne(5))) but reads left-to-right!

// asyncPipe: For async functions
const asyncPipe =
  <T>(...fns: Array<(arg: T) => Promise<T>>) =>
  async (x: T): Promise<T> => {
    let result = x;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };

// Usage with async functions
const processUser = asyncPipe(
  validateUser,
  normalizeUser,
  saveToDatabase, // async
  sendWelcomeEmail // async
);
```

### Practice Exercise:

Refactor this nested code using composition:

```typescript
// ❌ Nested (hard to read)
function processOrder(order) {
  const validated = validateOrder(order);
  const withTax = calculateTax(validated);
  const withShipping = calculateShipping(withTax);
  const formatted = formatForDatabase(withShipping);
  return formatted;
}

// ✅ YOUR TASK: Use pipe() to make it clearer!
```

<details>
<summary>Solution</summary>

```typescript
const processOrder = pipe(
  validateOrder,
  calculateTax,
  calculateShipping,
  formatForDatabase
);

// Even better: With types!
type Order = {
  /* ... */
};
type ValidOrder = Order & { validated: true };
type OrderWithTax = ValidOrder & { tax: number };
type OrderWithShipping = OrderWithTax & { shipping: number };
type DBOrder = {
  /* DB format */
};

const processOrder: (order: Order) => DBOrder = pipe(
  validateOrder, // Order → ValidOrder
  calculateTax, // ValidOrder → OrderWithTax
  calculateShipping, // OrderWithTax → OrderWithShipping
  formatForDatabase // OrderWithShipping → DBOrder
);

// Type-safe pipeline! TypeScript ensures each step fits!
```

</details>

### Key Takeaway:

**"Build software like LEGO: Small, focused pieces that snap together perfectly."**

Think: Assembly line, not monolith!

---

## 3. Immutability 🔴

### What is it?

**Definition from Eric Elliott**:

> "An immutable object is an object that can't be modified after it's created. Conversely, a mutable object is any object which can be modified after it's created."

### The Intuition:

Think of ice vs. water:

- **Mutable (water)**: Can change shape, temperature, location
- **Immutable (ice)**: Frozen in place, can't change

Or think of a contract:

- **Mutable**: Like using a pencil (anyone can erase/change it)
- **Immutable**: Like using a pen and making copies (original never changes)

### Simple Example:

```typescript
// ❌ MUTABLE: Original data changes
const user = { name: "John", age: 25 };
user.age = 26; // Mutates original!
console.log(user); // { name: 'John', age: 26 } ← Changed!

// ✅ IMMUTABLE: Create new data instead
const user = { name: "John", age: 25 };
const olderUser = { ...user, age: 26 }; // New object!
console.log(user); // { name: 'John', age: 25 } ← Original unchanged!
console.log(olderUser); // { name: 'John', age: 26 } ← New object!
```

### Why Immutability Is Better:

#### 1. **Predictability** - No Surprises 🎯

```typescript
// ❌ MUTABLE: Spooky action at a distance
const cart = { items: [] };

function addItem(cart, item) {
  cart.items.push(item); // Mutates!
  return cart;
}

function processOrder(cart) {
  const orderCart = cart; // Reference, not copy!
  addItem(orderCart, { id: 999, name: "Mystery Item" });
  // ... process order
}

// Somewhere else in your code:
const myCart = { items: [{ id: 1, name: "Book" }] };
console.log(myCart.items); // [{ id: 1, name: 'Book' }]

processOrder(myCart); // Process the order

console.log(myCart.items); // [{ id: 1, name: 'Book' }, { id: 999, name: 'Mystery Item' }]
// 😱 WTF?! My cart changed! I didn't add that item!

// ✅ IMMUTABLE: Explicit, predictable
function addItem(cart, item) {
  return {
    ...cart,
    items: [...cart.items, item], // New array!
  };
}

function processOrder(cart) {
  const orderCart = addItem(cart, { id: 999, name: "Mystery Item" });
  // myCart is unchanged, orderCart is new object
}

const myCart = { items: [{ id: 1, name: "Book" }] };
console.log(myCart.items); // [{ id: 1, name: 'Book' }]

processOrder(myCart);

console.log(myCart.items); // [{ id: 1, name: 'Book' }]
// ✅ Perfect! My cart is unchanged!
```

#### 2. **Debugging** - Time Travel 🕰️

```typescript
// ❌ MUTABLE: Can't track changes
let state = { count: 0, user: null };

function updateCount() {
  state.count++; // Lost history!
}

function updateUser(user) {
  state.user = user; // Can't undo!
}

updateCount();
updateUser({ name: "John" });
// Bug: "Count is wrong!"
// Where did it go wrong? Can't tell! History is lost!

// ✅ IMMUTABLE: Keep history
let history = [
  { count: 0, user: null }, // Initial state
];

function updateCount() {
  const currentState = history[history.length - 1];
  const newState = { ...currentState, count: currentState.count + 1 };
  history.push(newState); // Add to history!
}

function updateUser(user) {
  const currentState = history[history.length - 1];
  const newState = { ...currentState, user };
  history.push(newState);
}

updateCount();
updateUser({ name: "John" });

// Bug: "Count is wrong!"
console.log(history);
// [
//   { count: 0, user: null },     ← State 0
//   { count: 1, user: null },     ← State 1 (after updateCount)
//   { count: 1, user: { name: 'John' } }  ← State 2 (after updateUser)
// ]
// Can see exactly what happened! Time travel debugging!

// Can even undo:
history.pop(); // Go back one step
console.log(history[history.length - 1]);
// { count: 1, user: null } ← Back to previous state!
```

#### 3. **Change Detection** - Performance Optimization ⚡

```typescript
// React example (framework you might use later)

// ❌ MUTABLE: React can't detect changes efficiently
class TodoList extends Component {
  state = {
    todos: [],
  };

  addTodo = (text) => {
    this.state.todos.push({ text, done: false }); // Mutation!
    this.setState({}); // Force update (slow!)
  };

  render() {
    // React doesn't know what changed!
    // Has to re-render everything (slow!)
    return this.state.todos.map((todo) => <Todo {...todo} />);
  }
}

// ✅ IMMUTABLE: Fast change detection
class TodoList extends Component {
  state = {
    todos: [],
  };

  addTodo = (text) => {
    this.setState({
      todos: [...this.state.todos, { text, done: false }], // New array!
    });
  };

  render() {
    // React sees todos changed (reference changed!)
    // Only re-renders affected components (fast!)
    return this.state.todos.map((todo) => <Todo {...todo} />);
  }
}

// Change detection:
const oldTodos = [{ id: 1 }];
const newTodos = oldTodos;
oldTodos === newTodos; // true (same reference, can't detect change!)

const immutableTodos = [{ id: 1 }];
const updatedTodos = [...immutableTodos, { id: 2 }];
immutableTodos === updatedTodos; // false (different reference, change detected!)
```

#### 4. **Concurrency** - Thread Safety 🔒

```typescript
// ❌ MUTABLE: Race conditions
let counter = 0;

// Thread 1
function incrementA() {
  counter++; // Read, increment, write
}

// Thread 2
function incrementB() {
  counter++; // Read, increment, write
}

// If both run at same time:
// Thread 1: Reads 0
// Thread 2: Reads 0 (before Thread 1 writes!)
// Thread 1: Writes 1
// Thread 2: Writes 1
// Result: 1 (should be 2!) 😱

// ✅ IMMUTABLE: No race conditions
let counter = 0;

function incrementA() {
  return counter + 1; // Just returns new value
}

function incrementB() {
  return counter + 1; // Just returns new value
}

// Caller manages state:
counter = Math.max(incrementA(), incrementB());
// Even if parallel, no race condition (pure functions!)
```

### Real Example from Our Codebase:

**BEFORE (Mutable)**:

```typescript
// src/agent/agent.ts (BEFORE)
class Agent {
  private conversation: OpenAI.ChatCompletionMessage[] = [];

  async handleUserInput() {
    const userInput = await this.deps.getUserMessage();

    // ❌ Mutates conversation array
    this.conversation.push({
      role: "user",
      content: userInput,
    });

    // Later...
    const plan = await createPlan(this.conversation);

    if (!planApproved) {
      // ❌ Mutates again (removes last item)
      this.conversation.pop();
    }
  }

  async processInference() {
    const result = await runInference(this.conversation);

    // ❌ Mutates conversation
    this.conversation.push(result.message);

    if (hasToolCalls(result.message)) {
      const toolResults = await executeTools(result.message.tool_calls);

      // ❌ Mutates conversation (adds multiple items)
      this.conversation.push(...toolResults);
    }
  }
}

// Problems:
// 1. Hard to track changes (who modified conversation when?)
// 2. Can't undo/redo easily
// 3. Bugs from unexpected mutations
// 4. Testing is hard (shared mutable state)
```

**AFTER (Immutable)**:

```typescript
// src/agent/services/ConversationManager.ts (AFTER)
export class ConversationManager {
  // ✅ ReadonlyArray prevents external mutation
  private messages: ReadonlyArray<OpenAI.ChatCompletionMessage> = [];

  // ✅ Returns new array, doesn't mutate
  addMessage(message: OpenAI.ChatCompletionMessage): void {
    this.messages = [...this.messages, message]; // New array!
  }

  // ✅ Returns new array
  addMessages(messages: OpenAI.ChatCompletionMessage[]): void {
    this.messages = [...this.messages, ...messages]; // New array!
  }

  // ✅ Returns new array (previous state preserved)
  removeLastMessage(): void {
    this.messages = this.messages.slice(0, -1); // New array!
  }

  // ✅ Returns immutable snapshot
  getAll(): ReadonlyArray<OpenAI.ChatCompletionMessage> {
    return this.messages; // ReadonlyArray!
  }

  // ✅ Returns immutable slice
  getHistory(limit?: number): ReadonlyArray<OpenAI.ChatCompletionMessage> {
    return limit ? this.messages.slice(-limit) : this.messages;
  }

  // ✅ Creates new empty array
  clear(): void {
    this.messages = []; // New empty array!
  }
}

// Usage in Agent:
class Agent {
  private conversationManager = new ConversationManager();

  async handleUserInput() {
    const userInput = await this.deps.getUserMessage();

    // ✅ Immutable add
    this.conversationManager.addMessage({
      role: "user",
      content: userInput,
    });

    // Get immutable snapshot for planning
    const conversation = this.conversationManager.getAll();
    const plan = await createPlan(conversation);

    if (!planApproved) {
      // ✅ Immutable remove (creates new array)
      this.conversationManager.removeLastMessage();
    }
  }
}

// Benefits:
// ✅ Clear API for state changes
// ✅ Can't accidentally mutate from outside
// ✅ Easy to add undo/redo later
// ✅ Easy to test (predictable state changes)
```

### Immutability Patterns:

```typescript
// Pattern 1: Update object property
const user = { name: "John", age: 25 };

// ❌ Mutable
user.age = 26;

// ✅ Immutable
const updatedUser = { ...user, age: 26 };

// Pattern 2: Update nested object
const user = {
  name: "John",
  address: {
    city: "NYC",
    zip: "10001",
  },
};

// ❌ Mutable
user.address.city = "LA";

// ✅ Immutable
const updatedUser = {
  ...user,
  address: {
    ...user.address,
    city: "LA",
  },
};

// Pattern 3: Add to array
const numbers = [1, 2, 3];

// ❌ Mutable
numbers.push(4);

// ✅ Immutable
const newNumbers = [...numbers, 4];
// Or: const newNumbers = numbers.concat(4);

// Pattern 4: Remove from array
const numbers = [1, 2, 3, 4];

// ❌ Mutable
numbers.pop();
numbers.splice(1, 1);

// ✅ Immutable
const withoutLast = numbers.slice(0, -1);
const withoutIndex1 = [...numbers.slice(0, 1), ...numbers.slice(2)];
// Or: const filtered = numbers.filter((n, i) => i !== 1);

// Pattern 5: Update array element
const todos = [
  { id: 1, text: "Learn", done: false },
  { id: 2, text: "Code", done: false },
];

// ❌ Mutable
todos[0].done = true;

// ✅ Immutable
const updatedTodos = todos.map((todo) =>
  todo.id === 1 ? { ...todo, done: true } : todo
);
```

### When to Break Immutability Rules:

```typescript
// Sometimes mutation is OK (performance critical code):

// 1. Local scope (not shared)
function processLargeArray(data) {
  const result = []; // Local variable

  for (let i = 0; i < data.length; i++) {
    result.push(transform(data[i])); // Mutation is OK (local scope)
  }

  return result; // Return is the "immutable" part
}

// 2. Private implementation details
class Buffer {
  private cache = []; // Private, controlled mutations OK

  public add(item) {
    this.cache.push(item); // OK, internal detail
  }

  public flush() {
    const result = [...this.cache]; // Return copy (immutable API)
    this.cache = []; // Clear (controlled mutation)
    return result;
  }
}

// Rule: Public API should be immutable, private internals can use mutation for performance
```

### Practice Exercise:

Make this code immutable:

```typescript
// ❌ Mutable
const cart = {
  items: [],
  total: 0,
};

function addItem(item) {
  cart.items.push(item);
  cart.total += item.price;
}

function removeItem(itemId) {
  const index = cart.items.findIndex((i) => i.id === itemId);
  const item = cart.items[index];
  cart.items.splice(index, 1);
  cart.total -= item.price;
}

// ✅ YOUR TASK: Make it immutable!
```

<details>
<summary>Solution</summary>

```typescript
// ✅ Immutable
type Cart = {
  items: readonly Item[];
  total: number;
};

const createEmptyCart = (): Cart => ({
  items: [],
  total: 0,
});

const addItem = (cart: Cart, item: Item): Cart => ({
  items: [...cart.items, item],
  total: cart.total + item.price,
});

const removeItem = (cart: Cart, itemId: string): Cart => {
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) return cart;

  return {
    items: cart.items.filter((i) => i.id !== itemId),
    total: cart.total - item.price,
  };
};

// Usage:
let cart = createEmptyCart();
cart = addItem(cart, { id: "1", name: "Book", price: 10 });
cart = addItem(cart, { id: "2", name: "Pen", price: 2 });
cart = removeItem(cart, "1");
```

</details>

### Key Takeaway:

**"Treat data like ice, not water. Create new versions instead of changing originals."**

Immutability = Predictability + Debuggability + Testability!

---

## 4. Higher-Order Functions 🟣

### What is it?

**Definition from Eric Elliott**:

> "A higher-order function is a function that takes a function as an argument, or returns a function, or both."

### The Intuition:

Think of a **function factory** or a **recipe maker**:

- Regular function: "Here's how to make a sandwich"
- Higher-order function: "Tell me what you like, and I'll give you a custom recipe for YOUR sandwich"

Or think of **power tools**:

- Regular tool: Screwdriver (does one thing)
- Higher-order tool: Drill with interchangeable bits (takes attachments, does many things)

### Simple Example:

```typescript
// Regular function (not higher-order)
const double = (x: number): number => x * 2;
double(5); // 10

// Higher-order function #1: Takes a function as argument
const applyTwice = (fn: (x: number) => number, x: number): number => {
  return fn(fn(x));
};

applyTwice(double, 5); // double(double(5)) = double(10) = 20

// Higher-order function #2: Returns a function
const createMultiplier = (factor: number) => {
  return (x: number) => x * factor;
};

const triple = createMultiplier(3);
const quadruple = createMultiplier(4);

triple(5); // 15
quadruple(5); // 20
```

### Why Higher-Order Functions Are Better:

#### 1. **Abstraction** - Hide Complexity 🎭

```typescript
// ❌ WITHOUT higher-order functions: Repetitive
function processUsers(users) {
  const result = [];
  for (let i = 0; i < users.length; i++) {
    result.push(users[i].name.toUpperCase());
  }
  return result;
}

function processProducts(products) {
  const result = [];
  for (let i = 0; i < products.length; i++) {
    result.push(products[i].title.toUpperCase());
  }
  return result;
}

function processOrders(orders) {
  const result = [];
  for (let i = 0; i < orders.length; i++) {
    result.push(orders[i].id.toString());
  }
  return result;
}

// Same loop pattern 3 times! Only the transformation differs!

// ✅ WITH higher-order functions: Abstract the pattern
const map = <T, U>(arr: T[], fn: (item: T) => U): U[] => {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    result.push(fn(arr[i]));
  }
  return result;
};

// Now just define the transformation!
const processUsers = (users) => map(users, (user) => user.name.toUpperCase());

const processProducts = (products) =>
  map(products, (product) => product.title.toUpperCase());

const processOrders = (orders) => map(orders, (order) => order.id.toString());

// One pattern (map), many uses!
```

#### 2. **Customization** - Configure Behavior 🔧

```typescript
// ❌ WITHOUT higher-order functions: Hard-coded logic
function validateEmail(email: string): boolean {
  return email.includes("@") && email.includes(".");
}

function validatePhone(phone: string): boolean {
  return /^\d{10}$/.test(phone);
}

function validateAge(age: number): boolean {
  return age >= 18 && age <= 120;
}

// Need a new validator? Write another function!

// ✅ WITH higher-order functions: Generic validator factory
type Validator<T> = (value: T) => boolean;

const createValidator = <T>(
  errorMessage: string,
  test: (value: T) => boolean
): Validator<T> => {
  return (value: T): boolean => {
    const isValid = test(value);
    if (!isValid) {
      console.error(errorMessage);
    }
    return isValid;
  };
};

// Create custom validators easily!
const validateEmail = createValidator<string>(
  "Invalid email",
  (email) => email.includes("@") && email.includes(".")
);

const validatePhone = createValidator<string>("Invalid phone", (phone) =>
  /^\d{10}$/.test(phone)
);

const validateAge = createValidator<number>(
  "Invalid age",
  (age) => age >= 18 && age <= 120
);

// Need a new one? Just call the factory!
const validateUsername = createValidator<string>(
  "Username must be 3-20 characters",
  (username) => username.length >= 3 && username.length <= 20
);
```

#### 3. **Reusability** - DRY Principle 📦

```typescript
// Common higher-order functions from Array prototype

// map: Transform each item
const numbers = [1, 2, 3, 4];
const doubled = numbers.map((n) => n * 2);
// [2, 4, 6, 8]

// filter: Keep items that pass test
const evens = numbers.filter((n) => n % 2 === 0);
// [2, 4]

// reduce: Combine items into single value
const sum = numbers.reduce((total, n) => total + n, 0);
// 10

// These are all higher-order functions!
// They take a function as an argument.

// ❌ WITHOUT higher-order functions:
function doubleNumbers(arr) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    result.push(arr[i] * 2);
  }
  return result;
}

function filterEvens(arr) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] % 2 === 0) {
      result.push(arr[i]);
    }
  }
  return result;
}

function sumNumbers(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i];
  }
  return total;
}

// So much repetitive code!

// ✅ WITH higher-order functions:
const doubled = numbers.map((n) => n * 2);
const evens = numbers.filter((n) => n % 2 === 0);
const sum = numbers.reduce((total, n) => total + n, 0);

// Concise and clear!
```

#### 4. **Composition** - Chain Operations 🔗

```typescript
// Higher-order functions compose beautifully

const users = [
  { name: "John", age: 25, active: true },
  { name: "Jane", age: 30, active: false },
  { name: "Bob", age: 35, active: true },
  { name: "Alice", age: 20, active: true },
];

// ❌ WITHOUT chaining: Multiple steps
const activeUsers = [];
for (const user of users) {
  if (user.active) {
    activeUsers.push(user);
  }
}

const names = [];
for (const user of activeUsers) {
  names.push(user.name);
}

const upperNames = [];
for (const name of names) {
  upperNames.push(name.toUpperCase());
}

// ✅ WITH higher-order functions: Chain!
const upperNames = users
  .filter((user) => user.active)
  .map((user) => user.name)
  .map((name) => name.toUpperCase());

// One clear pipeline! Read like English:
// "Filter active users, get their names, uppercase them"
```

### Real Example from Our Codebase:

**BEFORE (Repetitive)**:

```typescript
// src/agent/agent.ts (BEFORE)

// Rendering SessionSwitcher
private async showSessionSwitcher(): Promise<void> {
  const React = await import('react');
  const { render } = await import('ink');
  const { SessionSwitcher } = await import('../components/SessionSwitcher.js');

  return new Promise((resolve) => {
    const { unmount } = render(
      React.createElement(SessionSwitcher, props)
    );

    setTimeout(() => {
      unmount();
      resolve();
    }, 50);
  });
}

// Rendering ConversationHistory (DUPLICATE CODE!)
private async showConversationHistory(): Promise<void> {
  const React = await import('react');
  const { render } = await import('ink');
  const { ConversationHistory } = await import('../components/ConversationHistory.js');

  return new Promise((resolve) => {
    const { unmount } = render(
      React.createElement(ConversationHistory, props)
    );

    setTimeout(() => {
      unmount();
      resolve();
    }, 10000);
  });
}

// Same pattern repeated 3+ times!
```

**AFTER (Higher-Order Function)**:

```typescript
// src/agent/services/UIRenderer.ts (AFTER)

// Higher-order function that returns a renderer
export const createComponentRenderer = () => {
  // Returns a function that renders any component
  return async <P>(
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

      const timeout = options.autoClose || null;

      if (timeout) {
        setTimeout(() => {
          unmount();
          setTimeout(resolve, 50);
        }, timeout);
      } else {
        // Manual close via props callback
      }
    });
  };
};

// Usage in Agent:
class Agent {
  private renderComponent = createComponentRenderer();

  async showSessionSwitcher() {
    await this.renderComponent(
      "../components/SessionSwitcher.js",
      "SessionSwitcher",
      {
        /* props */
      }
    );
  }

  async showConversationHistory() {
    await this.renderComponent(
      "../components/ConversationHistory.js",
      "ConversationHistory",
      {
        /* props */
      },
      { autoClose: 10000 }
    );
  }
}

// Benefits:
// ✅ One function handles all React rendering
// ✅ Easy to add new components (just call renderComponent)
// ✅ Consistent behavior across all renders
// ✅ No code duplication!
```

### Common Higher-Order Function Patterns:

```typescript
// Pattern 1: Decorator (wrap functionality)
const withLogging = <T extends (...args: any[]) => any>(fn: T) => {
  return ((...args: Parameters<T>) => {
    console.log(`Calling ${fn.name} with`, args);
    const result = fn(...args);
    console.log(`${fn.name} returned`, result);
    return result;
  }) as T;
};

const add = (a: number, b: number) => a + b;
const addWithLogging = withLogging(add);

addWithLogging(2, 3);
// Logs: "Calling add with [2, 3]"
// Logs: "add returned 5"

// Pattern 2: Memoization (cache results)
const memoize = <T extends (...args: any[]) => any>(fn: T) => {
  const cache = new Map();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

const slowFibonacci = (n: number): number => {
  if (n <= 1) return n;
  return slowFibonacci(n - 1) + slowFibonacci(n - 2);
};

const fastFibonacci = memoize(slowFibonacci);

slowFibonacci(40); // Takes 2 seconds
fastFibonacci(40); // Takes 0.01 seconds (cached!)

// Pattern 3: Debounce (delay execution)
const debounce = <T extends (...args: any[]) => any>(fn: T, delay: number) => {
  let timeoutId: NodeJS.Timeout;

  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
};

const search = (query: string) => {
  console.log(`Searching for: ${query}`);
};

const debouncedSearch = debounce(search, 300);

// User types: "h" "e" "l" "l" "o"
debouncedSearch("h");
debouncedSearch("he");
debouncedSearch("hel");
debouncedSearch("hell");
debouncedSearch("hello");
// Only logs once after 300ms: "Searching for: hello"

// Pattern 4: Partial Application
const partial = <T extends (...args: any[]) => any>(
  fn: T,
  ...presetArgs: any[]
) => {
  return (...laterArgs: any[]) => fn(...presetArgs, ...laterArgs);
};

const greet = (greeting: string, name: string) => {
  return `${greeting}, ${name}!`;
};

const sayHello = partial(greet, "Hello");
const sayHi = partial(greet, "Hi");

sayHello("John"); // "Hello, John!"
sayHi("Jane"); // "Hi, Jane!"
```

### Practice Exercise:

Create a higher-order function that adds error handling to any function:

```typescript
// ✅ YOUR TASK: Complete this function
const withErrorHandling = <T extends (...args: any[]) => any>(
  fn: T,
  onError: (error: Error) => void
) => {
  // Your code here
  // Should:
  // 1. Return a new function
  // 2. Call the original function in a try-catch
  // 3. Call onError if error occurs
  // 4. Return the result if no error
};

// Should work like this:
const divide = (a: number, b: number) => {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
};

const safeDivide = withErrorHandling(divide, (error) =>
  console.error("Error:", error.message)
);

safeDivide(10, 2); // 5
safeDivide(10, 0); // Logs: "Error: Division by zero", returns undefined
```

<details>
<summary>Solution</summary>

```typescript
const withErrorHandling = <T extends (...args: any[]) => any>(
  fn: T,
  onError: (error: Error) => void
): T => {
  return ((...args: Parameters<T>) => {
    try {
      return fn(...args);
    } catch (error) {
      onError(error as Error);
      return undefined;
    }
  }) as T;
};
```

</details>

### Key Takeaway:

**"Functions are first-class citizens. Treat them like data: pass them around, return them, transform them!"**

Higher-order functions = Code reuse + Abstraction + Flexibility!

---

## 5. Currying & Partial Application 🟡

### What is it?

**Definition from Eric Elliott**:

> "Currying is the process of taking a function with multiple arguments and returning a series of functions that take one argument each."

**Partial Application**:

> "Partial application is the process of applying a function to some of its arguments, producing a function with fewer arguments."

### The Intuition:

Think of **ordering at a restaurant**:

**Regular function**:

```
order(dish, size, drink) → "Here's your order!"
```

**Curried function**:

```
chooseRestaurant() → chooseCategory() → chooseDish() → "Here's your order!"
```

**Partial application**:

```
"I already know I want pizza (pre-configured), just tell me the size!"
```

### Simple Example:

```typescript
// Regular function (takes all args at once)
const add = (a: number, b: number, c: number): number => {
  return a + b + c;
};

add(1, 2, 3); // 6

// ✅ Curried function (one arg at a time)
const addCurried = (a: number) => (b: number) => (c: number) => {
  return a + b + c;
};

addCurried(1)(2)(3); // 6

// Why is this useful?
// You can create specialized functions!

const add1 = addCurried(1);
// add1 is now: (b) => (c) => 1 + b + c

const add1and2 = add1(2);
// add1and2 is now: (c) => 1 + 2 + c

add1and2(3); // 6
add1and2(10); // 13
add1and2(100); // 103

// One function → Many specialized versions!
```

### Currying vs Partial Application:

```typescript
// CURRYING: One argument at a time
const curriedAdd = (a: number) => (b: number) => (c: number) => a + b + c;

curriedAdd(1); // Returns function
curriedAdd(1)(2); // Returns function
curriedAdd(1)(2)(3); // Returns number: 6

// PARTIAL APPLICATION: Some arguments at once
const add = (a: number, b: number, c: number) => a + b + c;

const add1and2 = partial(add, 1, 2);
add1and2(3); // 6

// Currying = Always one arg
// Partial = Can be multiple args
```

### Why Currying Is Better:

#### 1. **Configuration** - Pre-set Arguments 🔧

```typescript
// ❌ WITHOUT currying: Repeat arguments
function sendEmail(from: string, to: string, subject: string, body: string) {
  console.log(`From: ${from}`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
}

// Must pass 'from' every time (your company email)
sendEmail("support@company.com", "user1@email.com", "Welcome", "Hi!");
sendEmail("support@company.com", "user2@email.com", "Update", "News!");
sendEmail("support@company.com", "user3@email.com", "Alert", "Important!");

// Repeating 'support@company.com' is annoying!

// ✅ WITH currying: Pre-configure
const sendEmailCurried =
  (from: string) => (to: string) => (subject: string) => (body: string) => {
    console.log(`From: ${from}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
  };

// Create configured version
const sendFromSupport = sendEmailCurried("support@company.com");

// Now just pass the changing parts!
sendFromSupport("user1@email.com")("Welcome")("Hi!");
sendFromSupport("user2@email.com")("Update")("News!");
sendFromSupport("user3@email.com")("Alert")("Important!");

// Even better: Create more specialized versions
const sendWelcomeEmail = sendFromSupport("Welcome");

sendWelcomeEmail("user@email.com")("Welcome to our platform!");
```

#### 2. **Dependency Injection** - Inject Dependencies Gradually 💉

```typescript
// ❌ WITHOUT currying: Pass all dependencies always
async function trackMessage(
  contextManager: ContextManager,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) {
  await contextManager.addMessage(conversationId, role, content);
}

// Must pass contextManager every time
await trackMessage(contextManager, convId, 'user', 'hello');
await trackMessage(contextManager, convId, 'assistant', 'hi');
await trackMessage(contextManager, convId, 'user', 'how are you?');

// ✅ WITH currying: Inject dependencies once
const createMessageTracker = (contextManager: ContextManager) =>
  (conversationId: string) =>
    (role: 'user' | 'assistant') =>
      async (content: string) => {
        await contextManager.addMessage(conversationId, role, content);
      };

// Inject dependencies at startup
const trackMessage = createMessageTracker(contextManager);
const trackInConversation = trackMessage(conversationId);

// Use throughout the application (no more passing contextManager!)
await trackInConversation('user')('hello');
await trackInConversation('assistant')('hi');
await trackInConversation('user')('how are you?');

// Even more specialized
const trackUserMessage = trackInConversation('user');
const trackAssistantMessage = trackInConversation('assistant');

await trackUserMessage('hello');
await trackAssistantMessage('hi there!');
await trackUserMessage('what's new?');
```

#### 3. **Function Composition** - Easier to Compose 🔗

```typescript
// Curried functions compose beautifully

// Regular functions (hard to compose)
const add = (a: number, b: number) => a + b;
const multiply = (a: number, b: number) => a * b;

// Can't easily compose these!
// compose(multiply, add) doesn't work (wrong arity)

// ✅ Curried functions (easy to compose)
const curriedAdd = (a: number) => (b: number) => a + b;
const curriedMultiply = (a: number) => (b: number) => a * b;

const add5 = curriedAdd(5);
const multiplyBy3 = curriedMultiply(3);

// Now they compose!
const transform = pipe(
  add5, // x → x + 5
  multiplyBy3 // x → x * 3
);

transform(10); // (10 + 5) * 3 = 45

// With more functions:
const addThenMultiplyThenDivide = pipe(
  curriedAdd(10),
  curriedMultiply(2),
  curriedDivide(4)
);

addThenMultiplyThenDivide(5); // ((5 + 10) * 2) / 4 = 7.5
```

### Real Example from Our Codebase:

**BEFORE (Passing all dependencies)**:

```typescript
// src/agent/agent.ts (BEFORE)

class Agent {
  async handleUserInput() {
    const userInput = await this.deps.getUserMessage();

    // Pass all dependencies every time
    if (this.currentConversationId) {
      const fileReferences = this.extractFileReferences(userInput);
      await this.contextManager.addMessage(
        this.currentConversationId, // Passed every time
        "user", // Passed every time
        userInput,
        { fileReferences }
      );
    }
  }

  async processInference() {
    const result = await runInference(this.conversation);

    // Pass dependencies again
    if (this.currentConversationId && result.message.content) {
      await this.contextManager.addMessage(
        this.currentConversationId, // Repeated
        "assistant", // Repeated
        result.message.content,
        { toolCalls: result.message.tool_calls }
      );
    }
  }
}

// Problem: Keep passing same arguments over and over!
```

**AFTER (With currying)**:

```typescript
// src/agent/services/MessageTracker.ts (AFTER)

// Curried message tracker factory
export const createMessageTracker =
  (contextManager: ContextManager) =>
  (conversationId: string) =>
  (role: "user" | "assistant") =>
  async (content: string, metadata?: MessageMetadata) => {
    await contextManager.addMessage(conversationId, role, content, metadata);
  };

// Usage in Agent:
class Agent {
  private trackMessage: ReturnType<typeof createMessageTracker>;
  private trackUserMessage: ReturnType<ReturnType<typeof createMessageTracker>>;
  private trackAssistantMessage: ReturnType<
    ReturnType<typeof createMessageTracker>
  >;

  async initialize() {
    // Configure once at startup
    const track = createMessageTracker(this.contextManager);
    this.trackMessage = track(this.currentConversationId);
    this.trackUserMessage = this.trackMessage("user");
    this.trackAssistantMessage = this.trackMessage("assistant");
  }

  async handleUserInput() {
    const userInput = await this.deps.getUserMessage();

    // Now just pass the content!
    await this.trackUserMessage(userInput, {
      fileReferences: this.extractFileReferences(userInput),
    });
  }

  async processInference() {
    const result = await runInference(this.conversation);

    // Clean!
    await this.trackAssistantMessage(result.message.content, {
      toolCalls: result.message.tool_calls,
    });
  }
}

// Benefits:
// ✅ No repeated arguments
// ✅ Dependencies injected once
// ✅ Cleaner code
// ✅ Easy to test (mock at creation time)
```

### Auto-Curry Helper:

```typescript
// Helper to automatically curry any function
function curry<T extends (...args: any[]) => any>(fn: T) {
  return function curried(...args: any[]): any {
    if (args.length >= fn.length) {
      return fn.apply(null, args);
    } else {
      return (...moreArgs: any[]) => curried(...args, ...moreArgs);
    }
  };
}

// Usage:
const add = (a: number, b: number, c: number) => a + b + c;
const curriedAdd = curry(add);

curriedAdd(1)(2)(3); // 6
curriedAdd(1, 2)(3); // 6
curriedAdd(1)(2, 3); // 6
curriedAdd(1, 2, 3); // 6

// All work! Flexible!
```

### Practical Use Cases:

```typescript
// Use case 1: Event handlers
const handleClick =
  (logger: Logger) => (analytics: Analytics) => (event: ClickEvent) => {
    logger.log("Click:", event.target);
    analytics.track("click", event);
  };

// Configure at component level
const onClick = handleClick(logger)(analytics);

// Use in many places
button1.addEventListener("click", onClick);
button2.addEventListener("click", onClick);

// Use case 2: API calls
const createApiClient =
  (baseUrl: string) =>
  (authToken: string) =>
  (endpoint: string) =>
  async (data?: any) => {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.json();
  };

// Configure once
const api = createApiClient("https://api.example.com");
const authenticatedApi = api("my-auth-token");

// Use throughout app
const getUsers = authenticatedApi("/users");
const getOrders = authenticatedApi("/orders");

await getUsers();
await getOrders();
```

### Practice Exercise:

Convert this regular function to a curried version:

```typescript
// Regular function
const createUrl = (
  protocol: string,
  domain: string,
  path: string,
  params: Record<string, string>
) => {
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return `${protocol}://${domain}${path}?${queryString}`;
};

createUrl("https", "example.com", "/api/users", { page: "1", limit: "10" });
// "https://example.com/api/users?page=1&limit=10"

// ✅ YOUR TASK: Make it curried!
// Should work like: createUrl('https')('example.com')('/api/users')({ page: '1' })
```

<details>
<summary>Solution</summary>

```typescript
const createUrlCurried =
  (protocol: string) =>
  (domain: string) =>
  (path: string) =>
  (params: Record<string, string>) => {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    return `${protocol}://${domain}${path}?${queryString}`;
  };

// Use cases:
const https = createUrlCurried("https");
const myDomain = https("example.com");
const usersEndpoint = myDomain("/api/users");

usersEndpoint({ page: "1", limit: "10" });
usersEndpoint({ page: "2", limit: "10" });
usersEndpoint({ page: "3", limit: "10" });

// Or all at once:
createUrlCurried("https")("example.com")("/api/users")({ page: "1" });
```

</details>

### Key Takeaway:

**"Curry your functions to create specialized tools from general ones. Pre-configure dependencies and reduce repetition!"**

Currying = Configuration + Dependency Injection + Composition!

---

## 6. Separation of Concerns 🟠

### What is it?

**Definition from Eric Elliott**:

> "Separation of concerns (SoC) is a design principle for separating a computer program into distinct sections, such that each section addresses a separate concern."

### The Intuition:

Think of a **restaurant kitchen**:

- ❌ **Bad**: One person does everything (prep, cook, plate, clean, serve)
- ✅ **Good**: Chef, sous chef, prep cook, dishwasher, server (each has one job)

Or think of a **human body**:

- Heart: Pumps blood (doesn't think)
- Brain: Thinks (doesn't pump blood)
- Lungs: Breathe (don't digest)
- Stomach: Digests (doesn't breathe)

Each organ has **one concern**!

### Simple Example:

```typescript
// ❌ BAD: Everything mixed together
class UserManager {
  // Database concern
  saveToDatabase(user) { ... }

  // Validation concern
  validateEmail(email) { ... }

  // Formatting concern
  formatName(name) { ... }

  // Authentication concern
  hashPassword(password) { ... }

  // Email concern
  sendWelcomeEmail(user) { ... }

  // Logging concern
  log(message) { ... }
}

// Too many concerns in one place!

// ✅ GOOD: Separated concerns
class UserRepository {
  // ONLY database operations
  save(user) { ... }
  findById(id) { ... }
}

class UserValidator {
  // ONLY validation
  validateEmail(email) { ... }
  validateAge(age) { ... }
}

class UserFormatter {
  // ONLY formatting
  formatName(name) { ... }
  formatDate(date) { ... }
}

class AuthService {
  // ONLY authentication
  hashPassword(password) { ... }
  verifyPassword(password, hash) { ... }
}

class EmailService {
  // ONLY emails
  sendWelcomeEmail(user) { ... }
  sendPasswordReset(user) { ... }
}

// Each class has ONE concern!
```

### Why Separation of Concerns Is Better:

#### 1. **Maintainability** - Change One Thing 🛠️

```typescript
// ❌ BAD: All concerns mixed
class Agent {
  // UI concern
  async showMessage(text) {
    console.log(text);
  }

  // Session concern
  async loadSession(id) {
    const session = await this.db.query(...);
    this.currentSession = session;
  }

  // Planning concern
  async createPlan(input) {
    const plan = await this.ai.generate(...);
    return plan;
  }

  // Execution concern
  async executeTool(tool) {
    await tool.run();
  }

  // Context concern
  async trackMessage(msg) {
    await this.db.insert(...);
  }
}

// Problem: Need to change database? Touch Agent class!
// Need to change UI? Touch Agent class!
// Need to change AI? Touch Agent class!
// Agent class has 100 reasons to change!

// ✅ GOOD: Separated concerns
class UIService {
  showMessage(text) { console.log(text); }
}

class SessionService {
  async load(id) { ... }
  async save(session) { ... }
}

class PlanningService {
  async createPlan(input) { ... }
}

class ExecutionService {
  async executeTool(tool) { ... }
}

class ContextService {
  async trackMessage(msg) { ... }
}

class Agent {
  constructor(
    private ui: UIService,
    private sessions: SessionService,
    private planning: PlanningService,
    private execution: ExecutionService,
    private context: ContextService
  ) {}

  async run() {
    // Just orchestrates services
    const session = await this.sessions.load(id);
    const plan = await this.planning.createPlan(input);
    await this.execution.executeTool(tool);
    await this.context.trackMessage(msg);
    this.ui.showMessage('Done!');
  }
}

// Now: Need to change database? Only touch ContextService!
// Need to change UI? Only touch UIService!
// Each service has ONE reason to change!
```

#### 2. **Testability** - Test Independently 🧪

```typescript
// ❌ BAD: Hard to test (all concerns coupled)
class OrderProcessor {
  async processOrder(order) {
    // Validation
    if (!order.items.length) throw new Error("Empty order");

    // Calculation
    const total = order.items.reduce((sum, item) => sum + item.price, 0);

    // Database
    await db.saveOrder({ ...order, total });

    // Payment
    await stripe.charge(order.userId, total);

    // Email
    await sendEmail(order.userEmail, "Order confirmed!");

    // Logging
    logger.info("Order processed", order.id);
  }
}

// To test: Need to mock database, Stripe, email, logger... nightmare!

// ✅ GOOD: Easy to test (concerns separated)
class OrderValidator {
  validate(order) {
    if (!order.items.length) throw new Error("Empty order");
  }
}

class OrderCalculator {
  calculateTotal(order) {
    return order.items.reduce((sum, item) => sum + item.price, 0);
  }
}

class OrderRepository {
  async save(order) {
    await db.saveOrder(order);
  }
}

class PaymentService {
  async charge(userId, amount) {
    await stripe.charge(userId, amount);
  }
}

class EmailService {
  async sendConfirmation(email, orderId) {
    await sendEmail(email, `Order ${orderId} confirmed!`);
  }
}

// Now testing is easy!
test("OrderValidator rejects empty orders", () => {
  const validator = new OrderValidator();
  expect(() => validator.validate({ items: [] })).toThrow("Empty order");
});

test("OrderCalculator sums prices correctly", () => {
  const calculator = new OrderCalculator();
  const total = calculator.calculateTotal({
    items: [{ price: 10 }, { price: 20 }],
  });
  expect(total).toBe(30);
});

// Each concern tested in isolation! No mocks needed!
```

#### 3. **Reusability** - Use Anywhere 📦

```typescript
// ❌ BAD: Can't reuse (tightly coupled)
class BlogPost {
  constructor(private title: string, private content: string) {}

  publish() {
    // Validation (can't reuse elsewhere)
    if (!this.title || !this.content) {
      throw new Error("Missing title or content");
    }

    // HTML generation (can't reuse)
    const html = `<h1>${this.title}</h1><p>${this.content}</p>`;

    // Save to DB (can't reuse)
    db.insert("posts", { title: this.title, content: this.content });

    // Send notification (can't reuse)
    sendEmail("admin@site.com", `New post: ${this.title}`);
  }
}

// Want to validate a Comment? Can't reuse BlogPost validation!
// Want to generate HTML for Product? Can't reuse BlogPost HTML gen!

// ✅ GOOD: Reusable concerns
class Validator {
  requireFields(obj, fields) {
    for (const field of fields) {
      if (!obj[field]) throw new Error(`Missing ${field}`);
    }
  }
}

class HTMLGenerator {
  createPost(title, content) {
    return `<h1>${title}</h1><p>${content}</p>`;
  }

  createComment(author, text) {
    return `<div><strong>${author}</strong>: ${text}</div>`;
  }
}

class Repository {
  async save(table, data) {
    await db.insert(table, data);
  }
}

class Notifier {
  async notify(recipient, message) {
    await sendEmail(recipient, message);
  }
}

// Now can use anywhere!
const validator = new Validator();
const htmlGen = new HTMLGenerator();
const repo = new Repository();
const notifier = new Notifier();

// For blog posts
validator.requireFields(post, ["title", "content"]);
const html = htmlGen.createPost(post.title, post.content);
await repo.save("posts", post);
await notifier.notify("admin@site.com", `New post: ${post.title}`);

// For comments (reuse same services!)
validator.requireFields(comment, ["author", "text"]);
const commentHtml = htmlGen.createComment(comment.author, comment.text);
await repo.save("comments", comment);
await notifier.notify("admin@site.com", `New comment by ${comment.author}`);
```

### Real Example from Our Codebase:

**BEFORE (Mixed concerns - 437 lines)**:

```typescript
// src/agent/agent.ts (BEFORE)

class Agent {
  private conversation: Message[] = [];
  private sessionId: string;
  private currentConversationId: string;
  private contextManager: ContextManager;

  // CONCERN 1: Session Management
  async initializeSession() {
    const sessions = await this.contextManager.listSessions();
    const existing = sessions.find(s => s.project === process.cwd());
    if (existing) {
      this.sessionId = existing.id;
      // ... 20 more lines
    }
  }

  async autoNameSession(message: string) {
    // ... 30 lines
  }

  // CONCERN 2: Command Handling
  async handleSlashCommand(input: string) {
    switch (input) {
      case '/help': await this.showHelp(); break;
      case '/sessions': await this.showSessionSwitcher(); break;
      // ... 30 more lines
    }
  }

  async showHelp() { ... }
  async showSessionSwitcher() { ... }
  async showConversationHistory() { ... }

  // CONCERN 3: UI Rendering
  // (React importing and rendering code repeated 3 times)

  // CONCERN 4: Conversation Management
  async handleUserInput() { ... }
  async processInference() { ... }

  // CONCERN 5: Planning
  async handlePlanApproval() { ... }

  // CONCERN 6: String utilities
  private extractFileReferences(content: string) { ... }
  private generateSessionName(message: string) { ... }
}

// 437 lines doing 6 different jobs!
```

**AFTER (Separated concerns)**:

```typescript
// src/agent/services/SessionService.ts
export class SessionService {
  // ONLY handles sessions
  async initialize(projectPath: string) { ... }
  async autoName(sessionId: string, message: string) { ... }
  async switch(sessionId: string) { ... }
}

// src/agent/services/CommandService.ts
export class CommandService {
  // ONLY handles commands
  async execute(command: string) { ... }
}

// src/agent/services/UIRenderer.ts
export const createComponentRenderer = () => {
  // ONLY handles UI rendering
  return async (component, props) => { ... };
};

// src/agent/services/ConversationManager.ts
export class ConversationManager {
  // ONLY handles conversation state
  addMessage(msg) { ... }
  removeLastMessage() { ... }
  getAll() { ... }
}

// src/agent/utils/stringUtils.ts
export const extractFileReferences = (content: string) => { ... };
export const generateSessionName = (message: string) => { ... };

// src/agent/agent.ts (AFTER - Just orchestration!)
export class Agent {
  constructor(
    private sessionService: SessionService,
    private commandService: CommandService,
    private conversationManager: ConversationManager,
    private uiRenderer: UIRenderer,
    private deps: AgentDependencies
  ) {}

  async run() {
    // Just coordinates services (100 lines vs 437!)
    await this.sessionService.initialize(process.cwd());

    while (true) {
      const input = await this.deps.getUserMessage();

      if (input.startsWith('/')) {
        await this.commandService.execute(input);
        continue;
      }

      this.conversationManager.addMessage({ role: 'user', content: input });
      await this.processInference();
    }
  }
}

// Benefits:
// ✅ Agent reduced from 437 → 100 lines
// ✅ Each service has ONE job
// ✅ Easy to find where to make changes
// ✅ Easy to test each service
// ✅ Services can be reused elsewhere
```

### The Layers Pattern:

```
┌───────────────────────────────────────┐
│         Presentation Layer            │  ← UI, formatting, display
│  (Components, Formatters, Renderers)  │
├───────────────────────────────────────┤
│         Application Layer             │  ← Business logic, workflows
│  (Services, Use Cases, Orchestration) │
├───────────────────────────────────────┤
│            Domain Layer               │  ← Core entities, rules
│  (Models, Validators, Calculations)   │
├───────────────────────────────────────┤
│       Infrastructure Layer            │  ← External systems
│  (Database, API, File System, Cache)  │
└───────────────────────────────────────┘

Each layer talks only to the layer below it!
```

### Practice Exercise:

Separate concerns in this mixed-up class:

```typescript
// ❌ Mixed concerns
class User {
  constructor(
    public name: string,
    public email: string,
    public password: string
  ) {}

  async save() {
    // Validation
    if (!this.email.includes("@")) throw new Error("Invalid email");

    // Password hashing
    const hashed = await bcrypt.hash(this.password, 10);

    // Database
    await db.insert("users", {
      name: this.name,
      email: this.email,
      password: hashed,
    });

    // Email
    await sendEmail(this.email, "Welcome!");

    // Logging
    console.log(`User ${this.name} registered`);
  }
}

// ✅ YOUR TASK: Separate into 4-5 classes/functions
// Hint: Validation, Hashing, Database, Email, Logging
```

<details>
<summary>Solution</summary>

```typescript
// Validation concern
class UserValidator {
  validate(user: { email: string }) {
    if (!user.email.includes("@")) {
      throw new Error("Invalid email");
    }
  }
}

// Hashing concern
class PasswordHasher {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}

// Database concern
class UserRepository {
  async save(user: { name: string; email: string; password: string }) {
    await db.insert("users", user);
  }
}

// Email concern
class EmailService {
  async sendWelcome(email: string) {
    await sendEmail(email, "Welcome!");
  }
}

// Logging concern
class Logger {
  logRegistration(name: string) {
    console.log(`User ${name} registered`);
  }
}

// Orchestrator (combines all concerns)
class UserRegistrationService {
  constructor(
    private validator: UserValidator,
    private hasher: PasswordHasher,
    private repository: UserRepository,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  async register(user: { name: string; email: string; password: string }) {
    this.validator.validate(user);

    const hashedPassword = await this.hasher.hash(user.password);

    await this.repository.save({
      ...user,
      password: hashedPassword,
    });

    await this.emailService.sendWelcome(user.email);

    this.logger.logRegistration(user.name);
  }
}
```

</details>

### Key Takeaway:

**"One class, one job. Like a kitchen: each person has their role. Don't make the chef also do the dishes!"**

Separation of Concerns = Maintainability + Testability + Reusability!

---

[Continuing with concepts 7-10...]

Would you like me to continue with the remaining 4 concepts (Single Responsibility, Factory Pattern, Command Pattern, Abstraction & Encapsulation)? I'll maintain the same teaching style with examples, practice exercises, and real-world applications! 🚀

---

## 7. Single Responsibility Principle (SRP) 🔷

### What is it?

**Definition from Eric Elliott / common software design:**

> "A module, class, or function should have one, and only one, reason to change."

### The Intuition:

Imagine a Swiss Army knife vs a specialized chef's knife:

- Swiss Army knife: many tools in one — convenient but awkward for delicate tasks.
- Chef's knife: designed for one job — when you need to slice an onion, reach for the chef's knife.

SRP says: prefer small focused tools (modules/functions) over giant multi-tool objects.

### Simple Example:

```typescript
// ❌ BAD: One class with multiple responsibilities
class ReportManager {
  generateReport(data: any[]) {
    // complex formatting
  }

  saveToDisk(path: string) {
    // file IO
  }

  sendEmail(recipient: string) {
    // email sending
  }

  logGeneration() {
    // logging
  }
}

// ✅ GOOD: Split into focused classes/functions
class ReportGenerator {
  generate(data: any[]) {
    /* formatting only */
  }
}

class FileStorage {
  save(path: string, content: string) {
    /* file IO only */
  }
}

class Mailer {
  send(recipient: string, content: string) {
    /* email only */
  }
}

class Logger {
  info(msg: string) {
    /* logging only */
  }
}

// Orchestrator coordinates them
async function createAndSendReport(
  data: any[],
  path: string,
  recipient: string
) {
  const report = new ReportGenerator().generate(data);
  new FileStorage().save(path, report);
  new Mailer().send(recipient, report);
  new Logger().info("Report created and sent");
}
```

### Why SRP Helps:

- Easier to reason about small modules.
- Smaller test surface; fewer mocks/stubs.
- Lowers risk of unrelated changes causing regressions.

### Real Example from Our Codebase:

**BEFORE (violates SRP)**:

```typescript
// src/agent/agent.ts (BEFORE)
class Agent {
  // session/state + rendering + context DB + inference + CLI parsing
  async runLoop() {
    /* 200+ lines mixing concerns */
  }
  saveSession() {
    /* DB + serialization */
  }
  renderUI() {
    /* UI rendering logic */
  }
}
```

**AFTER (SRP applied)**:

```typescript
// src/agent/services/SessionService.ts  (SRP: manages sessions only)
export class SessionService {
  async load(id: string) {
    /* ... */
  }
  async save(session: Session) {
    /* ... */
  }
}

// src/agent/services/UIRenderer.ts (SRP: UI rendering only)
export const createComponentRenderer = () => {
  /* ... */
};

// src/agent/agent.ts (orchestrator)
export class Agent {
  constructor(
    private sessions: SessionService,
    private renderer: ReturnType<typeof createComponentRenderer>,
    private contextManager: ContextManager
  ) {}

  async run() {
    // orchestrates focused services
  }
}
```

### Practice Exercise:

Refactor the following class to satisfy SRP. Identify at least two responsibilities and split them.

```typescript
class Notifier {
  async notifyUser(userId: string, message: string) {
    // lookup user
    // choose channel
    // format message
    // send via provider
    // log result
  }
}
```

<details>
<summary>Solution sketch</summary>

Split into:

- UserRepository (lookup user)
- MessageFormatter (formatting)
- NotificationProvider (send messages)
- NotificationLogger (log results)
- NotificationService (orchestrator that composes the above)

This makes each piece small and testable.

</details>

### Key Takeaway:

"One reason to change" — keep each module focused. SRP reduces accidental coupling and makes the codebase safer to evolve.

---

## 8. Factory Pattern 🧩

### What is it?

The Factory Pattern centralizes object (or service) creation. Instead of calling constructors across your codebase, a factory produces configured instances.

### The Intuition:

Think of a coffee shop: instead of each barista building their own espresso machine, there's a single station that configures machines the same way — consistent, configurable, and replaceable.

### Simple Example:

```typescript
// Without factory
const db = new Database("sqlite://...");
const cache = new Cache({ ttl: 60 });
const apiClient = new ApiClient({ baseUrl: "https://api" });

// With factory
class ServiceFactory {
  constructor(private config: AppConfig) {}

  createDatabase() {
    return new Database(this.config.dbUrl);
  }
  createCache() {
    return new Cache({ ttl: this.config.cacheTtl });
  }
  createApiClient() {
    return new ApiClient({ baseUrl: this.config.apiBase });
  }
}

const factory = new ServiceFactory(config);
const db = factory.createDatabase();
const api = factory.createApiClient();
```

### Why Use a Factory:

- Centralizes creation & config.
- Enables swapping implementations (for tests or environments).
- Encapsulates complex construction logic.

### Real Example from Our Codebase:

We often need a properly-configured message tracker, renderer, and context manager. A factory helps keep creation simple:

```typescript
// src/agent/factories/agentFactory.ts
export const createAgentDependencies = (config: AppConfig) => {
  const contextManager = new ContextManager(config.sqlitePath);
  const renderer = createComponentRenderer();
  const sessionService = new SessionService(contextManager);

  return { contextManager, renderer, sessionService };
};

// Usage
const deps = createAgentDependencies(appConfig);
const agent = new Agent(
  deps.sessionService,
  deps.renderer,
  deps.contextManager
);
```

### Practice Exercise:

Implement a factory that returns either an in-memory repository (for tests) or a SQLite-backed repository (for production) based on a config flag.

```typescript
// Hint: return the same interface type from both implementations
interface UserRepo {
  findById(id: string): Promise<User | null>;
  save(u: User): Promise<void>;
}

// YOUR TASK: Implement createUserRepo(config)
```

<details>
<summary>Solution sketch</summary>

```typescript
class InMemoryUserRepo implements UserRepo {
  /* map-based implementation */
}
class SQLiteUserRepo implements UserRepo {
  /* sqlite queries */
}

function createUserRepo(config: {
  useMemory: boolean;
  sqlitePath?: string;
}): UserRepo {
  if (config.useMemory) return new InMemoryUserRepo();
  return new SQLiteUserRepo(config.sqlitePath!);
}
```

</details>

### Key Takeaway:

Factories = Controlled, consistent construction. Use them to centralize configuration and swap implementations easily.

---

## 9. Command Pattern 🛠️

### What is it?

The Command Pattern encapsulates a request as an object. A command object contains all information needed to perform an action (and optionally undo it).

### The Intuition:

Think of a remote control where each button is a command object. You can queue commands, log them, undo them, or serialize them for replay.

### Simple Example:

```typescript
interface Command {
  execute(): Promise<void>;
  undo?(): Promise<void>;
}

class CreateFileCommand implements Command {
  constructor(private path: string, private content: string) {}
  async execute() {
    await fs.promises.writeFile(this.path, this.content);
  }
  async undo() {
    await fs.promises.unlink(this.path);
  }
}

class CommandInvoker {
  private history: Command[] = [];
  async run(cmd: Command) {
    await cmd.execute();
    this.history.push(cmd);
  }
  async undoLast() {
    const cmd = this.history.pop();
    if (cmd && cmd.undo) await cmd.undo();
  }
}

const invoker = new CommandInvoker();
await invoker.run(new CreateFileCommand("tmp.txt", "hello"));
await invoker.undoLast();
```

### Why Command Pattern Helps:

- Makes operations first-class values that can be queued, retried, logged, or undone.
- Decouples the caller from the receiver.
- Simplifies implementing features like undo/redo, macro recording, or CLI invocation mapping.

### Real Example from Our Codebase:

Agent tools that edit files, run shells, or modify context are natural commands. Wrapping each tool execution as a command gives us undo support and consistent logging.

```typescript
// src/agent/execution/commands/EditFileCommand.ts
import { Command } from "./types";
export class EditFileCommand implements Command {
  constructor(
    private filePath: string,
    private newContent: string,
    private fs = require("fs")
  ) {}
  private oldContent?: string;
  async execute() {
    this.oldContent = await fs.promises.readFile(this.filePath, "utf8");
    await fs.promises.writeFile(this.filePath, this.newContent);
  }
  async undo() {
    if (this.oldContent !== undefined) {
      await fs.promises.writeFile(this.filePath, this.oldContent);
    }
  }
}

// Invoker used inside agent execution service
```

### Practice Exercise:

Create a command for renaming a session: it should save the old name and be undoable.

```typescript
// Your task: implement RenameSessionCommand with execute() and undo()
```

<details>
<summary>Solution sketch</summary>

```typescript
class RenameSessionCommand implements Command {
  constructor(
    private sessionService: SessionService,
    private sessionId: string,
    private newName: string
  ) {}
  private oldName?: string;
  async execute() {
    const session = await this.sessionService.get(this.sessionId);
    this.oldName = session.name;
    await this.sessionService.updateName(this.sessionId, this.newName);
  }
  async undo() {
    if (this.oldName !== undefined)
      await this.sessionService.updateName(this.sessionId, this.oldName);
  }
}
```

</details>

### Key Takeaway:

Commands = Actions as data. Use them for undo/redo, queues, and decoupling.

---

## 10. Abstraction & Encapsulation 🛡️

### What is it?

Abstraction hides complexity behind a simpler interface. Encapsulation keeps related data and the operations on it bundled together and prevents external code from depending on internal details.

### The Intuition:

Think of driving a car: you don't need to know how the internal combustion engine times valves. You just use the steering wheel, gas, and brakes — the complex internals are hidden.

### Simple Example:

```typescript
// Encapsulated class with private state
class Counter {
  private value = 0;
  increment() {
    this.value += 1;
  }
  decrement() {
    this.value -= 1;
  }
  get() {
    return this.value;
  }
}

// Consumers don't access internals directly; they call methods.

// Abstraction via interface
interface Storage {
  save(key: string, value: string): Promise<void>;
  load(key: string): Promise<string | null>;
}

// Two different implementations hidden behind same interface
class InMemoryStorage implements Storage {
  /* ... */
}
class FileStorage implements Storage {
  /* ... */
}

// Consumer only depends on Storage interface
function useStorage(s: Storage) {
  /* ... */
}
```

### Why Abstraction & Encapsulation Help:

- Limits the blast radius of changes.
- Allows swapping implementations without changing consumers.
- Makes code easier to reason about and test.

### Real Example from Our Codebase:

We use `ContextManager` as an abstraction over the storage layer. The rest of the app calls `ContextManager` methods and doesn't care if the backing store is SQLite, JSON files, or an in-memory map.

```typescript
// src/agent/context/ContextManager.ts
export interface IContextManager {
  addMessage(
    conversationId: string,
    role: string,
    content: string
  ): Promise<void>;
  listSessions(projectPath?: string): Promise<Session[]>;
  // ... other methods
}

class SQLiteContextManager implements IContextManager {
  // private db connection
  // implements methods with SQL
}

// Agent only depends on IContextManager
```

### Practice Exercise:

Define an interface `Notifier` and two implementations: `ConsoleNotifier` and `EmailNotifier`. Use them interchangeably in a `NotificationService`.

<details>
<summary>Solution sketch</summary>

```typescript
interface Notifier {
  notify(to: string, msg: string): Promise<void>;
}
class ConsoleNotifier implements Notifier {
  async notify(to: string, msg: string) {
    console.log(to, msg);
  }
}
class EmailNotifier implements Notifier {
  constructor(private smtp: SmtpClient) {}
  async notify(to: string, msg: string) {
    await this.smtp.send(to, msg);
  }
}
class NotificationService {
  constructor(private notifier: Notifier) {}
  async send(to: string, msg: string) {
    await this.notifier.notify(to, msg);
  }
}
```

</details>

### Key Takeaway:

Hide complexity. Expose clear interfaces. Encapsulate state and behavior so other modules can't rely on fragile internals.

---

## Cheat Sheet (Quick Reference)

Below is a one-page quick reference you can paste into your editor for rapid lookup. It summarizes the 10 concepts and includes tiny code snippets.

### Pure Functions

- Definition: No side effects, same input → same output.
- Example: const add = (a,b) => a+b;

### Function Composition

- Chain functions: const pipeline = x => f(g(h(x)));

### Immutability

- Prefer new objects/arrays: const next = { ...obj, x: 2 };

### Higher-Order Functions

- Functions that take/return functions. Examples: map, filter, reduce.

### Currying & Partial Application

- Curry to pre-configure dependencies: const withAuth = curry(apiCall)(token);

### Separation of Concerns

- Layer responsibilities: UI / Application / Domain / Infrastructure.

### Single Responsibility

- One reason to change per module/function.

### Factory Pattern

- Centralize creation: const repo = createUserRepo(config);

### Command Pattern

- Commands are objects: invoker.run(new EditFileCommand(path, content));

### Abstraction & Encapsulation

- Depend on interfaces, hide internals: interface Storage { save(..) }

---

Completion summary:

- Appended concepts 7-10 to `COMPOSING_SOFTWARE_CONCEPTS.md`.
- Added a one-page cheat sheet at the end.

Next steps:

- If you want, I can (1) run a quick lint/format on the file, (2) split the cheat sheet into its own `COMPOSING_SOFTWARE_CHEATSHEET.md` file, or (3) start applying these patterns to `src/agent/agent.ts` refactor.
