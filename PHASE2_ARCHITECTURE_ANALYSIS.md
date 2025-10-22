# Phase 2: Architecture Deep Dive

**Date**: October 14, 2025  
**Purpose**: Detailed analysis of token management, architectural tradeoffs, and implementation strategies

---

## Table of Contents

1. [The Token Problem](#the-token-problem)
2. [Context Management Strategies](#context-management-strategies)
3. [Storage Architecture](#storage-architecture)
4. [Token Budget Analysis](#token-budget-analysis)
5. [Tradeoffs & Design Decisions](#tradeoffs--design-decisions)
6. [Alternative Approaches](#alternative-approaches)
7. [Performance Considerations](#performance-considerations)
8. [Security & Privacy](#security--privacy)

---

## The Token Problem

### Why Tokens Matter

**LLM Context Windows:**

- GPT-3.5: 4k-16k tokens
- GPT-4: 8k-32k tokens (standard), 128k (extended)
- Claude: 100k-200k tokens
- **1 token ≈ 0.75 words** (average)

**Problem**: A long conversation can easily exceed token limits

### Example: Token Explosion

```typescript
// Session 1: 10 messages
User: "Fix bug in agent.ts"        // 5 tokens
AI: *500 token response*
User: "Also update tests"          // 4 tokens
AI: *600 token response*
// ... 6 more exchanges

// Total: ~5,000 tokens

// Session 2: Continue work (next day)
User: "Resume work on agent.ts"    // 5 tokens

// Problem: Need to include Session 1 context!
// 5,000 tokens (history) + 500 tokens (system prompt) + 5 tokens (query)
// = 5,505 tokens BEFORE the AI even responds!
```

**Without smart context management:**

- Token limit reached after ~20 messages
- Can't include full history
- AI loses context
- User has to re-explain everything

**With smart context management:**

- Select only relevant context
- Compress/summarize old messages
- Maintain coherence with 4k token budget
- Work indefinitely without hitting limits

---

## Context Management Strategies

### Strategy 1: Sliding Window (Simple)

**Approach**: Keep only the last N messages

```typescript
async buildContext(conversationId: string): Promise<string> {
  const messages = await this.getMessages(conversationId);

  // Only last 10 messages
  const recentMessages = messages.slice(-10);

  return recentMessages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');
}
```

**Pros:**

- ✅ Simple to implement
- ✅ Predictable token usage
- ✅ Fast (no complex logic)

**Cons:**

- ❌ Loses important context from earlier
- ❌ Can't reference old discussions
- ❌ No understanding of relevance

**Token Budget**: Fixed (~2,000 tokens for 10 messages)

---

### Strategy 2: Relevance-Based Selection (Smart)

**Approach**: Select messages based on relevance to current query

```typescript
async buildContext(
  conversationId: string,
  currentQuery: string
): Promise<string> {
  const allMessages = await this.getMessages(conversationId);

  // 1. Always include: Last 5 messages (recency)
  const recent = allMessages.slice(-5);

  // 2. Include: Messages mentioning same files
  const queryFiles = this.extractFileRefs(currentQuery);
  const relevantByFile = allMessages.filter(m =>
    m.fileReferences?.some(f => queryFiles.includes(f))
  );

  // 3. Include: Messages with similar keywords
  const keywords = this.extractKeywords(currentQuery);
  const relevantByKeyword = allMessages.filter(m =>
    keywords.some(k => m.content.toLowerCase().includes(k))
  );

  // 4. Combine and deduplicate
  const selected = [
    ...recent,
    ...relevantByFile,
    ...relevantByKeyword
  ].filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);

  // 5. Sort by timestamp
  selected.sort((a, b) => a.timestamp - b.timestamp);

  return selected.map(m => `${m.role}: ${m.content}`).join('\n');
}
```

**Pros:**

- ✅ Includes relevant context from any point in conversation
- ✅ Adapts to current query
- ✅ Better coherence

**Cons:**

- ❌ More complex logic
- ❌ Can still hit token limits
- ❌ Requires NLP (keyword extraction)

**Token Budget**: Variable (200-4,000 tokens depending on relevance)

---

### Strategy 3: Hierarchical Summarization (Advanced)

**Approach**: Summarize old messages, keep recent ones detailed

```typescript
async buildContext(conversationId: string): Promise<string> {
  const messages = await this.getMessages(conversationId);

  // Group by time periods
  const veryOld = messages.filter(m => isOlderThan(m, 7, 'days'));
  const old = messages.filter(m => isOlderThan(m, 1, 'day'));
  const recent = messages.filter(m => isNewerThan(m, 1, 'day'));

  // Summarize very old messages
  const veryOldSummary = await this.summarizeMessages(veryOld);
  // Example: "Week 1: Implemented UserService with auth logic.
  //           Fixed 3 bugs in routing. Added tests."

  // Brief summaries for old messages
  const oldSummaries = old.map(m => this.briefSummary(m));
  // Example: "Day 2: Refactored agent.ts routing"

  // Full context for recent
  const recentFull = recent.map(m => `${m.role}: ${m.content}`);

  return [
    '# Earlier Work',
    veryOldSummary,
    '',
    '# Previous Day',
    ...oldSummaries,
    '',
    '# Recent Discussion',
    ...recentFull
  ].join('\n');
}
```

**Pros:**

- ✅ Maintains high-level context from entire history
- ✅ Detailed context for recent work
- ✅ Scales to very long conversations

**Cons:**

- ❌ Requires AI to generate summaries (costs API calls)
- ❌ Summarization can lose nuance
- ❌ Complex implementation

**Token Budget**: Fixed (~3,000 tokens total)

- Summary of old: 500 tokens
- Brief summaries: 1,000 tokens
- Recent full: 1,500 tokens

---

### Strategy 4: Hybrid (Recommended)

**Approach**: Combine all three strategies

```typescript
async buildContext(
  conversationId: string,
  currentQuery: string,
  tokenBudget: number = 3000
): Promise<string> {
  const messages = await this.getMessages(conversationId);

  // Phase 1: Always include (high priority)
  const mustInclude = [
    ...messages.slice(-5),              // Last 5 messages
    ...this.getMessagesWithFiles(       // Messages with current files
      messages,
      this.extractFileRefs(currentQuery)
    ),
    ...this.getMessagesWithEdits(messages), // Recent edits
  ];

  // Phase 2: Calculate remaining budget
  const usedTokens = this.estimateTokens(mustInclude);
  const remainingBudget = tokenBudget - usedTokens;

  // Phase 3: Add relevant context within budget
  const relevantMessages = this.rankByRelevance(
    messages,
    currentQuery
  );

  const additional = [];
  let currentTokens = 0;

  for (const msg of relevantMessages) {
    const msgTokens = this.estimateTokens([msg]);
    if (currentTokens + msgTokens <= remainingBudget) {
      additional.push(msg);
      currentTokens += msgTokens;
    } else {
      break;
    }
  }

  // Phase 4: Combine and format
  const allContext = [
    ...mustInclude,
    ...additional
  ].filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
   .sort((a, b) => a.timestamp - b.timestamp);

  return this.formatContext(allContext);
}
```

**Pros:**

- ✅ Guarantees important context included
- ✅ Respects token budget
- ✅ Adapts to query relevance
- ✅ Best of all approaches

**Cons:**

- ❌ Most complex implementation
- ❌ Requires token estimation

**Token Budget**: Configurable (default 3,000 tokens)

---

## Storage Architecture

### Option 1: SQLite (Recommended)

**Schema Design:**

```sql
-- Normalized relational design
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  started_at TIMESTAMP NOT NULL,
  last_updated_at TIMESTAMP NOT NULL,
  summary TEXT,
  token_count INTEGER DEFAULT 0
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  token_count INTEGER,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Indexes for fast queries
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- Full-text search
CREATE VIRTUAL TABLE messages_fts USING fts5(
  message_id UNINDEXED,
  content,
  content=messages,
  content_rowid=rowid
);
```

**Query Performance:**

```typescript
// Get last 10 messages: O(log n) with index
const recent = db
  .prepare(
    `
  SELECT * FROM messages 
  WHERE conversation_id = ?
  ORDER BY timestamp DESC 
  LIMIT 10
`
  )
  .all(conversationId);

// Search messages: O(log n) with FTS index
const results = db
  .prepare(
    `
  SELECT m.* FROM messages m
  JOIN messages_fts fts ON m.id = fts.message_id
  WHERE messages_fts MATCH ?
  ORDER BY rank
`
  )
  .all(searchQuery);

// Get file relationships: O(1) with proper indexes
const related = db
  .prepare(
    `
  SELECT file2, relation_count 
  FROM file_relations 
  WHERE file1 = ?
  ORDER BY relation_count DESC
  LIMIT 5
`
  )
  .all(filePath);
```

**Pros:**

- ✅ Fast queries (indexed lookups)
- ✅ Relational integrity (foreign keys)
- ✅ Full-text search (FTS5)
- ✅ Single file database
- ✅ ACID transactions
- ✅ Mature, battle-tested

**Cons:**

- ❌ Binary format (not human-readable)
- ❌ Requires migrations for schema changes
- ❌ Slightly more complex setup

**Storage Size:**

- 100 messages: ~50 KB
- 1,000 messages: ~500 KB
- 10,000 messages: ~5 MB
- Very efficient!

---

### Option 2: JSON Files

**File Structure:**

```
.agent-context/
├── conversations/
│   ├── conv-1.json          # Conversation metadata + messages
│   ├── conv-2.json
│   └── conv-3.json
├── files/
│   ├── agent.ts.json        # File context + edits
│   ├── types.ts.json
│   └── executeCode.ts.json
└── sessions/
    ├── session-1.json       # Session state
    └── session-2.json
```

**Data Format:**

```json
{
  "id": "conv-123",
  "startedAt": "2025-10-14T10:00:00Z",
  "lastUpdatedAt": "2025-10-14T15:30:00Z",
  "messages": [
    {
      "id": "msg-1",
      "timestamp": "2025-10-14T10:00:00Z",
      "role": "user",
      "content": "Fix bug in agent.ts",
      "fileReferences": ["agent.ts"],
      "tokenCount": 15
    },
    {
      "id": "msg-2",
      "timestamp": "2025-10-14T10:01:30Z",
      "role": "assistant",
      "content": "I've fixed the routing bug...",
      "toolCalls": [
        {
          "tool": "edit_file",
          "args": { "path": "agent.ts", "..." }
        }
      ],
      "tokenCount": 450
    }
  ],
  "summary": "Fixed routing bug in agent.ts",
  "totalTokens": 465
}
```

**Query Implementation:**

```typescript
// Load all conversations to search
async searchConversations(query: string): Promise<Conversation[]> {
  const files = await fs.readdir('./agent-context/conversations');
  const conversations = await Promise.all(
    files.map(f => fs.readFile(f, 'utf-8').then(JSON.parse))
  );

  // Filter by content
  return conversations.filter(conv =>
    conv.messages.some(m =>
      m.content.toLowerCase().includes(query.toLowerCase())
    )
  );
}
```

**Pros:**

- ✅ Simple implementation
- ✅ Human-readable
- ✅ Easy debugging (open files in editor)
- ✅ Easy backup (just copy folder)
- ✅ No dependencies

**Cons:**

- ❌ Slow for large datasets (no indexes)
- ❌ Must load entire files to query
- ❌ No relational queries
- ❌ No full-text search
- ❌ Potential file corruption

**Storage Size:**

- Same as SQLite (~5 MB for 10k messages)
- But slower access time

---

### Option 3: Hybrid (SQLite + JSON)

**Approach**: SQLite for queries, JSON for backups

```typescript
class ContextManager {
  private db: Database; // SQLite for fast queries

  async addMessage(msg: Message) {
    // Write to SQLite
    this.db.prepare("INSERT INTO messages ...").run(msg);

    // Also export to JSON (async, in background)
    this.exportToJSON(msg.conversationId);
  }

  async exportConversation(id: string): Promise<void> {
    const messages = this.db.prepare("SELECT * ...").all(id);
    const json = JSON.stringify({ id, messages }, null, 2);
    await fs.writeFile(`backups/${id}.json`, json);
  }
}
```

**Pros:**

- ✅ Fast queries (SQLite)
- ✅ Human-readable backups (JSON)
- ✅ Best of both worlds

**Cons:**

- ❌ More complex
- ❌ Storage duplication

---

## Token Budget Analysis

### Token Estimation

**Rough Formula:**

```typescript
function estimateTokens(text: string): number {
  // Average: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}
```

**More Accurate (using tokenizer library):**

```typescript
import { encode } from "gpt-tokenizer";

function estimateTokens(text: string): number {
  return encode(text).length;
}
```

### Context Budget Breakdown

**Total Budget**: 8,000 tokens (GPT-4 8k model)

**Allocation:**

```
System Prompt:           500 tokens   (6%)
Tool Definitions:        800 tokens   (10%)
File Context:          1,000 tokens   (12%)
Conversation History:  3,000 tokens   (38%)
Current Query:           500 tokens   (6%)
Response Buffer:       2,200 tokens   (28%)
────────────────────────────────────────
Total:                 8,000 tokens   (100%)
```

**Conservative Approach** (recommended):

```
Conversation History:  2,500 tokens   (31%)
Response Buffer:       2,700 tokens   (34%)
```

This leaves more room for AI responses.

### Message Counting

**Tracking Tokens Per Message:**

```typescript
interface Message {
  id: string;
  content: string;
  tokenCount: number; // Store estimated tokens
  // ...
}

async addMessage(msg: Message): Promise<void> {
  // Estimate tokens when storing
  msg.tokenCount = estimateTokens(msg.content);

  // Update conversation total
  await this.updateConversationTokens(msg.conversationId);
}
```

**Benefits:**

- Know token count without re-parsing
- Fast context budget calculation
- Can set limits (e.g., "max 10k tokens per conversation")

### Dynamic Budget Adjustment

```typescript
async buildContext(
  conversationId: string,
  query: string
): Promise<string> {
  // 1. Calculate available budget
  const systemTokens = 500;
  const toolTokens = 800;
  const fileTokens = await this.estimateFileContext();
  const queryTokens = estimateTokens(query);
  const responseBuffer = 2000;

  const availableBudget = 8000
    - systemTokens
    - toolTokens
    - fileTokens
    - queryTokens
    - responseBuffer;

  // 2. Build context within budget
  return await this.buildContextWithBudget(
    conversationId,
    availableBudget
  );
}
```

---

## Tradeoffs & Design Decisions

### Decision 1: Storage Backend

**Options:**

1. SQLite
2. JSON Files
3. PostgreSQL
4. MongoDB

**Analysis:**

| Criteria        | SQLite     | JSON       | PostgreSQL | MongoDB  |
| --------------- | ---------- | ---------- | ---------- | -------- |
| **Speed**       | ⭐⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Simplicity**  | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐⭐   |
| **Query Power** | ⭐⭐⭐⭐⭐ | ⭐         | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Setup**       | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐     |
| **Portability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐     |

**Decision**: **SQLite** ✅

- Best balance of performance, simplicity, portability
- No server required (single file)
- Excellent query performance with indexes
- Production-ready for this use case

---

### Decision 2: Context Selection Strategy

**Options:**

1. Sliding window (simple)
2. Relevance-based (smart)
3. Hierarchical summarization (advanced)
4. Hybrid (combination)

**Analysis:**

| Criteria             | Sliding    | Relevance | Summary        | Hybrid     |
| -------------------- | ---------- | --------- | -------------- | ---------- |
| **Implementation**   | Easy       | Medium    | Hard           | Medium     |
| **Coherence**        | ⭐⭐       | ⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| **Token Efficiency** | ⭐⭐⭐     | ⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| **Cost**             | Free       | Free      | 💰 (API calls) | Free       |
| **Predictability**   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐    | ⭐⭐           | ⭐⭐⭐⭐   |

**Decision**: **Hybrid** ✅

- Start with sliding window + relevance-based
- Add summarization in Phase 3 if needed
- No API costs (yet)
- Good enough for most use cases

---

### Decision 3: Token Estimation Method

**Options:**

1. Character-based estimation (text.length / 4)
2. Word-based estimation (words.length \* 1.3)
3. Actual tokenizer library (gpt-tokenizer)

**Analysis:**

| Method    | Accuracy | Speed      | Dependencies  |
| --------- | -------- | ---------- | ------------- |
| Character | ±30%     | ⭐⭐⭐⭐⭐ | None          |
| Word      | ±20%     | ⭐⭐⭐⭐   | None          |
| Tokenizer | ±2%      | ⭐⭐⭐     | gpt-tokenizer |

**Decision**: **Tokenizer Library** ✅

- Accuracy matters more than speed (estimation is cached)
- Only done once per message (on storage)
- Small dependency (~100 KB)

---

### Decision 4: Context Update Frequency

**Options:**

1. Real-time (update DB after every message)
2. Batched (update every N messages)
3. On-demand (update on exit/save)

**Tradeoff**: **Durability vs Performance**

```typescript
// Option 1: Real-time (safest)
async addMessage(msg: Message) {
  await this.db.insert(msg);  // Immediate write
  await this.db.commit();     // Flush to disk
}
// Pro: No data loss
// Con: Slower (disk I/O per message)

// Option 2: Batched (balanced)
async addMessage(msg: Message) {
  this.buffer.push(msg);

  if (this.buffer.length >= 10) {
    await this.flush();
  }
}
// Pro: Faster (fewer writes)
// Con: Can lose up to 10 messages on crash

// Option 3: On-demand (fastest)
async addMessage(msg: Message) {
  this.messages.push(msg);  // In-memory only
}

async onExit() {
  await this.saveAll();  // Write everything on exit
}
// Pro: Fastest (no I/O during conversation)
// Con: Lose all data on crash
```

**Decision**: **Real-time with WAL mode** ✅

```typescript
// Enable WAL (Write-Ahead Logging)
db.pragma("journal_mode = WAL");

// This gives us:
// - Real-time durability (no data loss)
// - Good performance (async writes)
// - ACID guarantees
```

---

## Alternative Approaches

### Alternative 1: Stateless (No Context Storage)

**Approach**: Don't store anything, rely on user to provide context

```typescript
// User must repeat context every time
User: "Fix the routing bug in @agent.ts that we discussed yesterday"

// AI has no history, user must explain:
User: "Yesterday we found that all code was being sent to sandbox
       instead of running npm/git locally. We need to fix the
       shouldRunLocally() check in executeCode.ts line 45."
```

**Pros:**

- ✅ Simplest implementation
- ✅ No storage overhead
- ✅ No privacy concerns

**Cons:**

- ❌ Terrible user experience
- ❌ User must remember everything
- ❌ Defeats purpose of AI assistant

**Verdict**: ❌ Not viable

---

### Alternative 2: Embedding-Based Retrieval

**Approach**: Store message embeddings, retrieve by semantic similarity

```typescript
import { OpenAI } from 'openai';

class ContextManager {
  async addMessage(msg: Message) {
    // Generate embedding
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: msg.content
    });

    // Store embedding with message
    await this.db.insert({ ...msg, embedding: embedding.data[0].embedding });
  }

  async buildContext(query: string): Promise<string> {
    // Get query embedding
    const queryEmbedding = await this.getEmbedding(query);

    // Find similar messages by cosine similarity
    const similar = await this.findSimilar(queryEmbedding, limit: 10);

    return similar.map(m => m.content).join('\n');
  }
}
```

**Pros:**

- ✅ Semantic understanding (finds related concepts, not just keywords)
- ✅ Better than keyword matching
- ✅ Works with paraphrasing

**Cons:**

- ❌ Requires API calls (cost: $0.0001 per 1k tokens)
- ❌ Added latency (~200ms per query)
- ❌ Storage overhead (1536 dimensions per message)
- ❌ Complex implementation (vector similarity search)

**Verdict**: ⏸️ Phase 3 enhancement (not Phase 2)

---

### Alternative 3: Graph-Based Context

**Approach**: Model conversations as a knowledge graph

```typescript
// Nodes: Messages, Files, Concepts
// Edges: References, Edits, Relationships

interface GraphNode {
  id: string;
  type: "message" | "file" | "concept";
  content: string;
}

interface GraphEdge {
  from: string;
  to: string;
  type: "references" | "edits" | "discusses";
  weight: number;
}

// Query: "What files are related to UserService?"
// Traverse graph: UserService → (edits) → agent.ts
//                             → (discusses) → "auth refactor"
//                             → (references) → UserRepository.ts
```

**Pros:**

- ✅ Rich relationship modeling
- ✅ Powerful queries
- ✅ Automatic relationship discovery

**Cons:**

- ❌ Very complex implementation
- ❌ Requires graph database (Neo4j, etc.)
- ❌ Overkill for this use case

**Verdict**: ❌ Too complex for Phase 2

---

## Performance Considerations

### Optimization 1: Lazy Loading

**Problem**: Loading all messages is slow for long conversations

**Solution**: Only load what's needed

```typescript
// ❌ Bad: Load everything
async getConversation(id: string): Promise<Conversation> {
  const messages = await this.db.getAllMessages(id);  // 10,000 messages!
  return { id, messages };
}

// ✅ Good: Load on-demand
async getRecentMessages(id: string, limit: number): Promise<Message[]> {
  return this.db.getMessages(id, limit);  // Only 10 messages
}
```

---

### Optimization 2: Message Indexing

**Problem**: Searching messages is slow without indexes

**Solution**: Database indexes + full-text search

```sql
-- Index on conversation_id (for filtering)
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- Index on timestamp (for sorting)
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- Full-text index for searching
CREATE VIRTUAL TABLE messages_fts USING fts5(
  message_id,
  content
);
```

**Performance:**

- Without index: O(n) scan (slow for 10k+ messages)
- With index: O(log n) lookup (fast even with 1M messages)

---

### Optimization 3: Token Count Caching

**Problem**: Re-calculating tokens for every context build is slow

**Solution**: Store token count with message

```typescript
interface Message {
  id: string;
  content: string;
  tokenCount: number;  // ← Cached on insert
}

// Calculate once on insert
async addMessage(msg: Message) {
  msg.tokenCount = estimateTokens(msg.content);
  await this.db.insert(msg);
}

// Use cached value for budget calculation
async buildContext(id: string, budget: number): Promise<string> {
  const messages = await this.getMessages(id);

  let totalTokens = 0;
  const selected = [];

  for (const msg of messages) {
    if (totalTokens + msg.tokenCount <= budget) {
      selected.push(msg);
      totalTokens += msg.tokenCount;  // ← No recalculation!
    }
  }

  return this.formatMessages(selected);
}
```

---

### Optimization 4: Connection Pooling

**Problem**: Opening DB connection per query is slow

**Solution**: Reuse connection

```typescript
class ContextManager {
  private static instance: ContextManager;
  private db: Database;

  private constructor() {
    this.db = new Database("context.db");
    this.db.pragma("journal_mode = WAL"); // Performance boost
  }

  static getInstance(): ContextManager {
    if (!this.instance) {
      this.instance = new ContextManager();
    }
    return this.instance; // Reuse connection
  }
}
```

---

## Security & Privacy

### Concern 1: Sensitive Data in Context

**Risk**: API keys, passwords in conversation history

**Mitigation:**

```typescript
class ContextManager {
  private sensitivePatterns = [
    /api[_-]?key[:\s=]+[a-zA-Z0-9_-]+/gi,
    /password[:\s=]+[^\s]+/gi,
    /sk-[a-zA-Z0-9]{48}/g, // OpenAI keys
  ];

  async addMessage(msg: Message) {
    // Redact sensitive data before storing
    msg.content = this.redactSensitive(msg.content);
    await this.db.insert(msg);
  }

  private redactSensitive(text: string): string {
    let redacted = text;
    for (const pattern of this.sensitivePatterns) {
      redacted = redacted.replace(pattern, "[REDACTED]");
    }
    return redacted;
  }
}
```

---

### Concern 2: Database Encryption

**Risk**: Context database readable on disk

**Mitigation**: SQLite encryption (SQLCipher)

```typescript
import SQLite from "better-sqlite3";

const db = new SQLite("context.db");
db.pragma("key = 'your-encryption-key'"); // Encrypt database
```

**Tradeoff**: ~15% performance overhead

---

### Concern 3: Data Retention

**Risk**: Storing conversations forever (privacy, storage)

**Mitigation**: Auto-cleanup policy

```typescript
class ContextManager {
  // Delete conversations older than 90 days
  async cleanupOldConversations(days: number = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    await this.db
      .prepare(
        `
      DELETE FROM conversations 
      WHERE last_updated_at < ?
    `
      )
      .run(cutoff.toISOString());
  }

  // Run on startup
  async initialize() {
    await this.cleanupOldConversations();
  }
}
```

---

## Recommended Implementation

### Phase 2.1: MVP (Week 1)

**Scope**: Basic persistence without optimization

1. **SQLite storage** with simple schema
2. **Sliding window** context (last 10 messages)
3. **Character-based** token estimation
4. **Real-time** DB writes

**Complexity**: Low  
**Time**: 2-3 days  
**Value**: High (80% of benefit)

---

### Phase 2.2: Optimization (Week 2)

**Scope**: Add smart context selection

1. **Relevance-based** message selection
2. **Tokenizer library** for accuracy
3. **Indexes** for fast queries
4. **Token count caching**

**Complexity**: Medium  
**Time**: 2-3 days  
**Value**: Medium (15% improvement)

---

### Phase 2.3: Advanced (Phase 3)

**Scope**: Future enhancements

1. **Embedding-based** retrieval
2. **Conversation summaries**
3. **Graph relationships**
4. **Database encryption**

**Complexity**: High  
**Time**: 1-2 weeks  
**Value**: Low (5% improvement, niche use cases)

---

## Conclusion

### Key Takeaways

1. **Token management is critical** - Context windows fill up fast
2. **Smart selection > More storage** - Quality over quantity
3. **SQLite is perfect** for this use case - Fast, simple, portable
4. **Start simple, optimize later** - Sliding window → Relevance → Embeddings
5. **Cache everything** - Token counts, message metadata, relationships

### Success Metrics

- ✅ Conversation persistence across restarts
- ✅ Context retrieval under 100ms
- ✅ Token budget never exceeded
- ✅ Relevant context always included
- ✅ Storage under 10 MB for typical usage

### Next Steps

1. Install `better-sqlite3`
2. Create database schema
3. Implement `ContextManager` class
4. Integrate with agent
5. Test with long conversations
6. Optimize based on profiling

**Ready to build! 🚀**
