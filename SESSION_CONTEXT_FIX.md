# Session Switching Context Fix

## The Problem

When switching between sessions using `/sessions`, the AI was still talking about the **previous session's context** instead of the new session.

### Why This Happened

```typescript
// Before the fix:
onSessionChange: async (sessionId) => {
  this.sessionId = sessionId; // ✅ Updated
  this.currentConversationId = session.currentConversationId; // ✅ Updated
  // ❌ BUT: this.conversation array was NOT cleared!
};
```

The agent has an in-memory `conversation` array that stores all OpenAI chat messages. When switching sessions, we updated the session ID and conversation ID, but **the old messages were still in memory**, so the AI continued with the old context!

### Example of the Bug

```
Session 1 (interviewprep project):
User: "Help me with interview prep"
AI: "Sure, let's work on algorithms..."

[User switches to Session 2 via /sessions]

Session 2 (terminal_coding_agent_ver2 project):
User: "What are we working on?"
AI: "We're working on interview prep algorithms..."  ❌ WRONG!
```

---

## The Solution

### Fix 1: Clear Conversation on Switch

```typescript
onSessionChange: async (sessionId) => {
  this.sessionId = sessionId;
  this.currentConversationId = session.currentConversationId;

  // Clear the in-memory conversation to prevent context leakage
  this.conversation = []; // ✅ FIXED!
};
```

### Fix 2: Load Previous Messages (Even Better!)

Instead of starting completely fresh, we can **load the previous conversation from the database**:

```typescript
onSessionChange: async (sessionId) => {
  this.sessionId = sessionId;
  this.currentConversationId = session.currentConversationId;

  // Clear old conversation
  this.conversation = [];

  // Load previous messages from this session's conversation
  const messages = await this.contextManager.getConversationMessages(
    session.currentConversationId,
    20 // Load last 20 messages for context
  );

  // Restore them to the conversation
  for (const msg of messages) {
    this.conversation.push({
      role: msg.role,
      content: msg.content,
    });
  }

  console.log(`✅ Switched to session: ${session.name}`);
  console.log(`📝 Loaded ${messages.length} previous message(s)`);
};
```

### Fix 3: Same for New Sessions

```typescript
onCreateSession: async () => {
  const session = await this.contextManager.createSession(...);
  this.sessionId = session.id;
  this.currentConversationId = session.currentConversationId;

  // Clear conversation for fresh start
  this.conversation = [];  // ✅ FIXED!

  console.log(`✅ Created new session`);
  console.log(`📝 Starting fresh conversation`);
}
```

---

## How It Works Now

### Scenario 1: Switch to Existing Session with History

```
Session 1 (interviewprep):
User: "Help me with algorithms"
AI: "Sure! Let's start..."
[Conversation saved to database]

[User switches to Session 2]

Session 2 (terminal_coding_agent_ver2):
✅ Conversation cleared
✅ Loaded 6 previous messages from Session 2's database
AI now has correct context for terminal_coding_agent_ver2!

User: "What are we working on?"
AI: "We're working on the terminal coding agent..."  ✅ CORRECT!
```

### Scenario 2: Switch to Session with No History

```
[User switches to Session 3 (new/empty session)]

Session 3:
✅ Conversation cleared
✅ Loaded 0 messages (empty session)
AI starts fresh with no prior context

User: "Hello"
AI: "Hello! How can I help you today?"  ✅ CORRECT!
```

### Scenario 3: Create New Session

```
[User creates new session via 'n' in /sessions]

New Session:
✅ Conversation cleared
AI starts completely fresh

User: "Let's build something"
AI: "Great! What would you like to build?"  ✅ CORRECT!
```

---

## Testing

### Test Case 1: Context Isolation

```bash
# Start in Project A
npm start
> "Help me with React components"

# Switch to Project B
> /sessions
[Select Project B]

# Ask a question
> "What are we working on?"
Expected: AI talks about Project B, not React
```

### Test Case 2: Context Restoration

```bash
# In Project A session
> "My project uses TypeScript"
> "Let's add a new feature"

# Switch away and back
> /sessions
[Select Project B]
> /sessions
[Select Project A again]

# Ask a question
> "What language am I using?"
Expected: AI says "TypeScript" (loaded from history)
```

### Test Case 3: Fresh Start

```bash
# Create new session
> /sessions
[Press 'n' to create new]

# Ask a question
> "Hello"
Expected: AI has no prior context from other sessions
```

---

## Code Changes

### Modified: `src/agent/agent.ts`

**In `showSessionSwitcher()` method:**

1. Added `this.conversation = []` to clear old messages
2. Added loading of previous messages from database
3. Added informative console messages

**In `onCreateSession` callback:**

1. Added `this.conversation = []` for fresh start
2. Added informative console message

---

## Benefits

✅ **No Context Leakage**: Switching sessions truly switches context  
✅ **Context Restoration**: Previous messages are loaded from database  
✅ **Fresh Starts**: New sessions start clean  
✅ **User Clarity**: Console messages show what's happening  
✅ **Data Integrity**: Database remains source of truth

---

## Future Enhancements

### Option: Ask User About Context Loading

```typescript
const loadPrevious = await this.deps.getPlanApproval(
  `Load ${messages.length} previous messages from this session?`
);

if (loadPrevious) {
  this.conversation = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
} else {
  this.conversation = [];
}
```

### Option: Configurable Message Limit

```typescript
// Load last N messages (configurable)
const CONTEXT_MESSAGE_LIMIT = 20;

const messages = await this.contextManager.getConversationMessages(
  session.currentConversationId,
  CONTEXT_MESSAGE_LIMIT
);
```

### Option: Smart Context Loading

```typescript
// Load messages within token budget
const messages = await this.contextManager.buildContext(
  session.currentConversationId,
  { tokenBudget: 3000 }
);
```

---

## Try It Now!

```bash
npm run build  # ✅ Already built
npm start

# Test switching:
> "We're working on interview prep"
> /sessions
[Switch to another session]
> "What are we working on?"
# Should talk about NEW session, not interview prep!
```

🎉 **Sessions now maintain proper context isolation!**
