# Phase 2: Persistent Context Management

**Status**: 🚀 STARTING  
**Date**: October 14, 2025  
**Goal**: Implement conversation history, file context tracking, and session persistence

---

## Overview

Phase 2 builds on the intent-based architecture from Phase 1.6 by adding **persistent context** - allowing the agent to remember conversations, track file relationships, and maintain state across sessions.

### Problem Statement

**Current Limitation:**

```
Session 1:
User: "Fix the bug in @agent.ts"
AI: *fixes bug*

Session 2:
User: "What did we fix last time?"
AI: "I don't remember" ❌
```

**Desired Behavior:**

```
Session 1:
User: "Fix the bug in @agent.ts"
AI: *fixes bug, remembers context*

Session 2:
User: "What did we fix last time?"
AI: "We fixed the routing bug in agent.ts, line 42" ✅
```

---

## Core Features

### 1. Conversation History

**Purpose**: Remember all interactions across sessions

**Features:**

- Store messages and AI responses
- Track file references and edits
- Search conversation history
- Reference previous discussions

**Storage:**

```typescript
interface Message {
  id: string;
  timestamp: Date;
  role: "user" | "assistant" | "system";
  content: string;
  fileReferences?: string[]; // @agent.ts, @types.ts
  toolCalls?: ToolCall[]; // Which tools were used
  edits?: FileEdit[]; // What files were modified
}

interface Conversation {
  id: string;
  startedAt: Date;
  lastUpdatedAt: Date;
  messages: Message[];
  summary?: string; // AI-generated summary
}
```

**Use Cases:**

- "What did we discuss about UserService?"
- "Show me all the files we edited yesterday"
- "Summarize our last conversation"

---

### 2. File Context Tracking

**Purpose**: Understand relationships between files and recent changes

**Features:**

- Track which files are frequently referenced together
- Remember recent edits and their purpose
- Suggest related files
- Auto-load context for follow-up questions

**Storage:**

```typescript
interface FileContext {
  path: string;
  lastAccessed: Date;
  accessCount: number;
  relatedFiles: string[]; // Files often used together
  recentEdits: FileEdit[];
  purpose?: string; // AI-inferred purpose
}

interface FileEdit {
  timestamp: Date;
  conversationId: string;
  messageId: string;
  oldContent: string;
  newContent: string;
  diff: string;
  reason: string; // "Fixed routing bug"
}
```

**Use Cases:**

- "Continue working on UserService" (auto-loads UserService.ts + related files)
- "What did we change in agent.ts?" (shows recent edits)
- "Why did we edit this file?" (shows reason from conversation)

---

### 3. Session Persistence

**Purpose**: Save and resume work across restarts

**Features:**

- Save conversation state
- Restore context on restart
- Multiple sessions (switch between projects)
- Export/import conversations

**Storage:**

```typescript
interface Session {
  id: string;
  name: string;
  project?: string; // Project/workspace path
  currentConversation: string; // Conversation ID
  activeFiles: string[]; // Files currently being worked on
  createdAt: Date;
  lastActive: Date;
}
```

**Use Cases:**

- "Resume last session" (loads conversation + file context)
- "Switch to UserAuth project" (loads different session)
- "Export this session" (saves to JSON file)

---

## Technical Design

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  - AutocompleteInput (intent + @files)                  │
│  - ConversationHistory (show past messages)             │
│  - SessionSwitcher (switch between projects)            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   Agent Layer                            │
│  - Process user intent                                   │
│  - Select tools                                          │
│  - Execute actions                                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                 Context Manager (NEW)                    │
│  - Store messages                                        │
│  - Track file context                                    │
│  - Build context for AI                                  │
│  - Manage sessions                                       │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                 Storage Layer                            │
│  - SQLite database OR JSON files                        │
│  - Conversations, file edits, sessions                   │
└─────────────────────────────────────────────────────────┘
```

### Storage Options

**Option 1: SQLite** (Recommended)

- ✅ Fast queries
- ✅ Relational data (messages → files → edits)
- ✅ Full-text search
- ✅ Single file database
- ❌ More complex setup

**Option 2: JSON Files**

- ✅ Simple implementation
- ✅ Easy to debug/inspect
- ✅ Human-readable
- ❌ Slow for large histories
- ❌ No relational queries

**Decision**: Start with SQLite for scalability

---

## Implementation Plan

### Phase 2.1: Context Manager Foundation

**Files to Create:**

```
src/agent/context/
├── ContextManager.ts       - Main context management class
├── storage.ts              - SQLite storage layer
├── types.ts                - Type definitions
└── index.ts                - Exports
```

**Core Class:**

```typescript
class ContextManager {
  // Conversation management
  async createConversation(): Promise<Conversation>;
  async addMessage(conversationId: string, message: Message): Promise<void>;
  async getConversation(id: string): Promise<Conversation>;
  async searchConversations(query: string): Promise<Conversation[]>;

  // File context
  async trackFileAccess(path: string): Promise<void>;
  async recordFileEdit(edit: FileEdit): Promise<void>;
  async getFileContext(path: string): Promise<FileContext>;
  async getRelatedFiles(path: string): Promise<string[]>;

  // Session management
  async createSession(name: string): Promise<Session>;
  async saveSession(session: Session): Promise<void>;
  async loadSession(id: string): Promise<Session>;
  async listSessions(): Promise<Session[]>;

  // Context building (for AI prompts)
  async buildContext(conversationId: string): Promise<string>;
}
```

**Estimated Time**: 4-6 hours

---

### Phase 2.2: Storage Implementation

**Database Schema:**

```sql
-- Conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  started_at TIMESTAMP,
  last_updated_at TIMESTAMP,
  summary TEXT
);

-- Messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  timestamp TIMESTAMP,
  role TEXT,
  content TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- File references (many-to-many)
CREATE TABLE message_files (
  message_id TEXT,
  file_path TEXT,
  FOREIGN KEY (message_id) REFERENCES messages(id),
  PRIMARY KEY (message_id, file_path)
);

-- File context
CREATE TABLE file_contexts (
  path TEXT PRIMARY KEY,
  last_accessed TIMESTAMP,
  access_count INTEGER,
  purpose TEXT
);

-- File edits
CREATE TABLE file_edits (
  id TEXT PRIMARY KEY,
  file_path TEXT,
  conversation_id TEXT,
  message_id TEXT,
  timestamp TIMESTAMP,
  old_content TEXT,
  new_content TEXT,
  diff TEXT,
  reason TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- Related files (many-to-many)
CREATE TABLE file_relations (
  file1 TEXT,
  file2 TEXT,
  relation_count INTEGER,
  PRIMARY KEY (file1, file2)
);

-- Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT,
  project TEXT,
  current_conversation TEXT,
  created_at TIMESTAMP,
  last_active TIMESTAMP,
  FOREIGN KEY (current_conversation) REFERENCES conversations(id)
);

-- Active files in session
CREATE TABLE session_files (
  session_id TEXT,
  file_path TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  PRIMARY KEY (session_id, file_path)
);

-- Full-text search
CREATE VIRTUAL TABLE messages_fts USING fts5(
  id,
  content,
  content=messages,
  content_rowid=rowid
);
```

**Estimated Time**: 3-4 hours

---

### Phase 2.3: Agent Integration

**Changes to Agent:**

```typescript
// src/agent/agent.ts

import { ContextManager } from "./context/index.js";

class CodingAgent {
  private contextManager: ContextManager;
  private currentConversation?: string;

  async initialize() {
    this.contextManager = new ContextManager();

    // Load or create session
    const session = await this.loadOrCreateSession();
    this.currentConversation = session.currentConversation;
  }

  async processMessage(userMessage: string) {
    // 1. Add message to conversation
    await this.contextManager.addMessage(this.currentConversation!, {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    // 2. Build context from history
    const context = await this.contextManager.buildContext(
      this.currentConversation!
    );

    // 3. Get AI response (with context)
    const aiResponse = await this.getAIResponse(userMessage, context);

    // 4. Track file accesses
    const fileRefs = this.extractFileReferences(userMessage);
    for (const file of fileRefs) {
      await this.contextManager.trackFileAccess(file);
    }

    // 5. Save AI response
    await this.contextManager.addMessage(this.currentConversation!, {
      role: "assistant",
      content: aiResponse,
      timestamp: new Date(),
    });

    return aiResponse;
  }

  async handleToolCall(tool: string, args: any) {
    // Track edits if it's an edit tool
    if (tool === "edit_file") {
      await this.contextManager.recordFileEdit({
        filePath: args.path,
        conversationId: this.currentConversation!,
        // ... edit details
      });
    }
  }
}
```

**Estimated Time**: 2-3 hours

---

### Phase 2.4: UI Components

**New Components:**

```typescript
// src/components/ConversationHistory.tsx
// Shows past messages with file references

// src/components/SessionSwitcher.tsx
// Switch between different sessions/projects

// src/components/FileContextPanel.tsx
// Shows related files and recent edits
```

**Updated Components:**

```typescript
// src/components/AutocompleteInput.tsx
// Add history search: /history query
```

**Estimated Time**: 3-4 hours

---

### Phase 2.5: Testing

**Test Cases:**

1. **Conversation Persistence**

   - Create conversation
   - Add messages
   - Restart agent
   - Verify history loaded

2. **File Context Tracking**

   - Edit multiple files
   - Verify relationships tracked
   - Query related files
   - Verify suggestions accurate

3. **Session Management**

   - Create multiple sessions
   - Switch between sessions
   - Verify context isolated
   - Export/import sessions

4. **Context Building**
   - Long conversation (50+ messages)
   - Verify relevant context extracted
   - Verify token limits respected
   - Verify performance acceptable

**Estimated Time**: 2-3 hours

---

## Context Building Strategy

### Challenge: Token Limits

**Problem**: Can't send entire conversation history to AI (token limits)

**Solution**: Smart context selection

```typescript
async buildContext(conversationId: string): Promise<string> {
  const conversation = await this.getConversation(conversationId);

  // 1. Always include: Last N messages (recency)
  const recentMessages = conversation.messages.slice(-10);

  // 2. Include: Messages with file references (relevance)
  const fileMessages = conversation.messages.filter(m =>
    m.fileReferences?.length > 0
  );

  // 3. Include: Messages with edits (actions)
  const editMessages = conversation.messages.filter(m =>
    m.toolCalls?.some(t => t.tool === 'edit_file')
  );

  // 4. Build context string
  const context = [
    '# Conversation History',
    '',
    '## Recent Messages',
    ...recentMessages.map(m => `${m.role}: ${m.content}`),
    '',
    '## Files Referenced',
    ...fileMessages.map(m => `${m.fileReferences?.join(', ')}`),
    '',
    '## Recent Edits',
    ...editMessages.map(m => `Edited ${m.edits?.map(e => e.path)}`),
  ].join('\n');

  return context;
}
```

### Context Prioritization

**Priority Order:**

1. **Last 10 messages** (most relevant)
2. **Current file references** (what user is asking about)
3. **Recent edits** (what we just changed)
4. **Related files** (files often used together)
5. **Conversation summary** (high-level context)

**Token Budget:**

- System prompt: ~500 tokens
- Recent messages: ~2000 tokens
- File context: ~1000 tokens
- Current query: ~500 tokens
- **Total: ~4000 tokens** (safe for 8k context models)

---

## User Workflows

### Workflow 1: Resume Previous Work

```
User: "Resume last session"

Agent:
  1. Loads last active session
  2. Retrieves conversation history
  3. Shows summary: "Working on UserService refactor"
  4. Auto-loads: UserService.ts, UserRepository.ts
  5. Ready for next instruction

User: "Continue the refactor"

Agent:
  1. Reads conversation history
  2. Understands: "We were splitting auth logic"
  3. Continues from where we left off
```

---

### Workflow 2: Reference Previous Work

```
User: "What bug did we fix in agent.ts?"

Agent:
  1. Searches conversation history
  2. Finds: "Fixed routing bug on line 42"
  3. Retrieves file edit details
  4. Shows: Diff of the change + reason

User: "Why did we make that change?"

Agent:
  1. Finds original conversation
  2. Shows: "The routing was sending all code to sandbox"
  3. Context preserved!
```

---

### Workflow 3: Multi-File Context

```
User: "@UserService.ts refactor this to use dependency injection"

Agent:
  1. Tracks: UserService.ts accessed
  2. Makes changes
  3. Records: File edit + reason

User: "Update the tests too"

Agent:
  1. Knows: UserService.ts was just edited
  2. Infers: Related file is UserService.test.ts
  3. Suggests: "Update UserService.test.ts?"
  4. Auto-loads test file
  5. Makes updates
```

---

## Success Metrics

### Phase 2 Goals

- ✅ Conversation history stored persistently
- ✅ File context tracked accurately
- ✅ Sessions saveable/restorable
- ✅ Context building under token limits
- ✅ Performance: <100ms for context retrieval
- ✅ UI components for history/sessions

### Performance Targets

- Message storage: <10ms per message
- Context retrieval: <100ms
- File relationship inference: <200ms
- Session switch: <500ms
- Full conversation search: <1s

---

## Timeline

**Total Estimated Time**: 14-20 hours

### Week 1: Foundation

- Day 1-2: ContextManager + storage layer (7-10 hours)
- Day 3: Agent integration (2-3 hours)

### Week 2: Polish

- Day 4: UI components (3-4 hours)
- Day 5: Testing + bug fixes (2-3 hours)

---

## Next Steps

1. **Install SQLite library**

   ```bash
   npm install better-sqlite3
   npm install -D @types/better-sqlite3
   ```

2. **Create ContextManager skeleton**

   ```typescript
   // src/agent/context/ContextManager.ts
   export class ContextManager {
     constructor(dbPath: string) {
       // Initialize SQLite
     }
   }
   ```

3. **Design database schema**

   ```sql
   -- conversations, messages, files, etc.
   ```

4. **Implement core methods**

   ```typescript
   // addMessage, getConversation, etc.
   ```

5. **Integrate with agent**

   ```typescript
   // Track all interactions
   ```

6. **Build UI components**

   ```typescript
   // ConversationHistory, SessionSwitcher
   ```

7. **Test thoroughly**
   ```typescript
   // Test persistence, retrieval, performance
   ```

---

**Ready to begin Phase 2! 🚀**

**First Task**: Install SQLite and create ContextManager foundation
