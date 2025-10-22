# Phase 9: Refactoring storage.ts - Repository Pattern

## Overview

Phase 9 focuses on refactoring `context/storage.ts` (672 lines) by applying the **Repository Pattern**. Currently, the SQLiteStorage class mixes database schema management, SQL query construction, data mapping, and business logic. We'll separate these concerns into focused repositories, each handling one entity type.

## The Problem: God Class with Mixed Concerns

### Current Structure (storage.ts - 672 lines)

```
SQLiteStorage class:
├── Schema Management (170 lines)
│   ├── initializeSchema() - Creates all tables
│   ├── createIndexes() - Creates all indexes
│   └── createFullTextSearch() - Creates FTS tables
│
├── Conversation Operations (79 lines)
│   ├── createConversation()
│   ├── getConversation()
│   └── updateConversation()
│
├── Message Operations (133 lines)
│   ├── saveMessage()
│   ├── getMessages()
│   ├── searchMessages()
│   └── mapMessageRow()
│
├── File Context Operations (82 lines)
│   ├── getFileContext()
│   ├── trackFileUsage()
│   ├── saveFileEdit()
│   └── getFileEdits()
│
├── Session Operations (114 lines)
│   ├── createSession()
│   ├── getSession()
│   ├── updateSession()
│   ├── getAllSessions()
│   └── deleteSession()
│
└── Cleanup Operations (94 lines)
    └── close()
```

### Why This Is a Problem

1. **Too Many Responsibilities**: One class manages 5 different entity types
2. **Hard to Test**: Must mock entire database for testing any operation
3. **Hard to Modify**: Changing conversation logic might break session logic
4. **Poor Reusability**: Can't reuse conversation operations without the entire class
5. **Difficult to Mock**: Testing code that uses storage requires complex setup

### Real-World Example

If we want to:

- Add a new conversation feature → Must edit 672-line file
- Change message storage → Risk breaking sessions, files, and conversations
- Test conversation logic → Must set up entire database with all tables
- Switch database → Must rewrite entire class

## The Solution: Repository Pattern

### Repository Pattern

**Definition**: "Mediates between the domain and data mapping layers using a collection-like interface for accessing domain objects."

**Applied to Storage**:

- **Repositories** → One per entity (Conversation, Message, File, Session)
- **Database** → Single shared database connection
- **Mappers** → Convert between database rows and domain objects
- **Interface** → Abstract database operations behind clean API

### Pattern Benefits

1. ✅ **Single Responsibility**: Each repository manages ONE entity type
2. ✅ **Testability**: Mock repositories individually
3. ✅ **Maintainability**: Changes isolated to specific repositories
4. ✅ **Reusability**: Reuse repositories in different contexts
5. ✅ **Abstraction**: Hide database implementation details

## Detailed Design

### New Structure (context/storage/ folder)

```
context/
├── storage/
│   ├── database.ts                    (~80 lines) - Database connection & schema
│   ├── mappers/
│   │   ├── ConversationMapper.ts     (~40 lines) - Row ↔ Conversation
│   │   ├── MessageMapper.ts          (~50 lines) - Row ↔ Message
│   │   ├── FileContextMapper.ts      (~40 lines) - Row ↔ FileContext
│   │   ├── SessionMapper.ts          (~45 lines) - Row ↔ Session
│   │   └── index.ts                  (~15 lines) - Exports
│   │
│   ├── repositories/
│   │   ├── ConversationRepository.ts (~100 lines) - Conversation CRUD
│   │   ├── MessageRepository.ts      (~140 lines) - Message CRUD + search
│   │   ├── FileContextRepository.ts  (~110 lines) - File tracking
│   │   ├── SessionRepository.ts      (~120 lines) - Session management
│   │   └── index.ts                  (~20 lines) - Exports
│   │
│   ├── StorageManager.ts             (~60 lines) - Facade for all repositories
│   └── index.ts                      (~25 lines) - Public API
│
├── types.ts                          (unchanged) - Domain types
├── ContextManager.ts                 (update imports)
└── storage.ts                        (DELETE after migration)
```

**Total**: ~845 lines (vs 672 lines) - More lines but MUCH better organized

### 1. database.ts - Connection & Schema

```typescript
export class Database {
  private db: BetterSqlite.Database;

  constructor(dbPath?: string) {
    this.db = new BetterSqlite(dbPath || this.getDefaultPath());
    this.db.pragma("journal_mode = WAL");
    this.initializeSchema();
  }

  /**
   * Get raw database connection (for repositories)
   */
  getConnection(): BetterSqlite.Database {
    return this.db;
  }

  /**
   * Initialize all database tables
   */
  private initializeSchema(): void {
    // Create all tables, indexes, and FTS
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
```

**Single Responsibility**: Manage database connection and schema

### 2. Mappers - Data Transformation

#### ConversationMapper.ts

```typescript
export class ConversationMapper {
  /**
   * Convert database row to domain object
   */
  static toDomain(row: ConversationRow): Conversation {
    return {
      id: row.id,
      startedAt: new Date(row.started_at),
      lastUpdatedAt: new Date(row.last_updated_at),
      messages: [], // Loaded separately
      summary: row.summary || undefined,
      totalTokens: row.total_tokens,
    };
  }

  /**
   * Convert domain object to database row
   */
  static toRow(conversation: Conversation): ConversationRow {
    return {
      id: conversation.id,
      started_at: conversation.startedAt.toISOString(),
      last_updated_at: conversation.lastUpdatedAt.toISOString(),
      summary: conversation.summary || null,
      total_tokens: conversation.totalTokens,
    };
  }
}
```

**Single Responsibility**: Convert between database rows and domain objects

### 3. Repositories - Data Access

#### ConversationRepository.ts

```typescript
export class ConversationRepository {
  constructor(private db: BetterSqlite.Database) {}

  /**
   * Create a new conversation
   */
  async create(conversation: Conversation): Promise<void> {
    const row = ConversationMapper.toRow(conversation);
    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, started_at, last_updated_at, summary, total_tokens)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      row.id,
      row.started_at,
      row.last_updated_at,
      row.summary,
      row.total_tokens
    );
  }

  /**
   * Get conversation by ID
   */
  async findById(id: string): Promise<Conversation | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM conversations WHERE id = ?
    `);

    const row = stmt.get(id) as ConversationRow | undefined;
    return row ? ConversationMapper.toDomain(row) : null;
  }

  /**
   * Update existing conversation
   */
  async update(conversation: Conversation): Promise<void> {
    const row = ConversationMapper.toRow(conversation);
    const stmt = this.db.prepare(`
      UPDATE conversations
      SET last_updated_at = ?, summary = ?, total_tokens = ?
      WHERE id = ?
    `);

    stmt.run(row.last_updated_at, row.summary, row.total_tokens, row.id);
  }

  /**
   * Delete conversation
   */
  async delete(id: string): Promise<void> {
    const stmt = this.db.prepare(`DELETE FROM conversations WHERE id = ?`);
    stmt.run(id);
  }
}
```

**Single Responsibility**: Manage conversation data access

#### MessageRepository.ts

```typescript
export class MessageRepository {
  constructor(private db: BetterSqlite.Database) {}

  /**
   * Save a new message
   */
  async save(message: Message, conversationId: string): Promise<void> {
    const row = MessageMapper.toRow(message, conversationId);

    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, timestamp, role, content, token_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      row.id,
      row.conversation_id,
      row.timestamp,
      row.role,
      row.content,
      row.token_count
    );

    // Save file references if any
    if (message.fileReferences && message.fileReferences.length > 0) {
      this.saveFileReferences(message.id, message.fileReferences);
    }
  }

  /**
   * Get messages for a conversation
   */
  async findByConversationId(
    conversationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Message[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const stmt = this.db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(conversationId, limit, offset) as MessageRow[];
    return rows.map((row) => MessageMapper.toDomain(row));
  }

  /**
   * Full-text search in messages
   */
  async search(query: string): Promise<Message[]> {
    const stmt = this.db.prepare(`
      SELECT m.* FROM messages m
      JOIN messages_fts fts ON m.id = fts.message_id
      WHERE messages_fts MATCH ?
      ORDER BY rank
      LIMIT 20
    `);

    const rows = stmt.all(query) as MessageRow[];
    return rows.map((row) => MessageMapper.toDomain(row));
  }

  private saveFileReferences(messageId: string, files: string[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO message_files (message_id, file_path)
      VALUES (?, ?)
    `);

    for (const file of files) {
      stmt.run(messageId, file);
    }
  }
}
```

**Single Responsibility**: Manage message data access and search

### 4. StorageManager - Facade

```typescript
/**
 * Facade for all repositories
 * Provides unified access to storage operations
 */
export class StorageManager implements IStorage {
  private database: Database;
  public conversations: ConversationRepository;
  public messages: MessageRepository;
  public fileContexts: FileContextRepository;
  public sessions: SessionRepository;

  constructor(dbPath?: string) {
    this.database = new Database(dbPath);
    const db = this.database.getConnection();

    // Initialize repositories
    this.conversations = new ConversationRepository(db);
    this.messages = new MessageRepository(db);
    this.fileContexts = new FileContextRepository(db);
    this.sessions = new SessionRepository(db);
  }

  /**
   * Implement IStorage interface for backward compatibility
   */
  async createConversation(conversation: Conversation): Promise<void> {
    return this.conversations.create(conversation);
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversations.findById(id);
  }

  // ... other IStorage methods delegate to repositories ...

  /**
   * Close database connection
   */
  close(): void {
    this.database.close();
  }
}
```

**Responsibility**: Provide unified access to all repositories

## Benefits of This Refactoring

### 1. Easy to Test Each Repository

```typescript
// Before: Must setup entire database
test("create conversation", async () => {
  const storage = new SQLiteStorage(":memory:");
  // Must initialize ALL tables
  await storage.createConversation(conversation);
});

// After: Test one repository in isolation
test("create conversation", async () => {
  const mockDb = createMockDatabase();
  const repo = new ConversationRepository(mockDb);
  await repo.create(conversation);

  // Verify only conversation operations
});
```

### 2. Easy to Modify One Entity

```typescript
// Want to add conversation tags? Only touch ConversationRepository
class ConversationRepository {
  async addTag(conversationId: string, tag: string): Promise<void> {
    // Add tag logic - doesn't affect messages, files, or sessions
  }
}
```

### 3. Easy to Reuse Repositories

```typescript
// Reuse message repository in different contexts
const messageRepo = new MessageRepository(db);

// Use in API endpoint
app.get("/messages/:id", async (req, res) => {
  const messages = await messageRepo.findByConversationId(req.params.id);
  res.json(messages);
});

// Use in CLI tool
const messages = await messageRepo.search("error handling");
console.log(messages);
```

### 4. Easy to Switch Database

```typescript
// Create PostgreSQL implementation
class PostgresMessageRepository implements IMessageRepository {
  async save(message: Message): Promise<void> {
    // PostgreSQL implementation
  }
}

// Swap implementation without changing business logic
const messageRepo = isProduction
  ? new PostgresMessageRepository(pgClient)
  : new MessageRepository(sqliteDb);
```

## Migration Strategy

### Step 1: Create Database Manager

1. Create `storage/database.ts`
2. Extract schema initialization from storage.ts
3. Provide getConnection() for repositories

### Step 2: Create Mappers

1. Create `storage/mappers/ConversationMapper.ts`
2. Create `storage/mappers/MessageMapper.ts`
3. Create `storage/mappers/FileContextMapper.ts`
4. Create `storage/mappers/SessionMapper.ts`
5. Test each mapper independently

### Step 3: Create Repositories

1. Create `storage/repositories/ConversationRepository.ts`
2. Create `storage/repositories/MessageRepository.ts`
3. Create `storage/repositories/FileContextRepository.ts`
4. Create `storage/repositories/SessionRepository.ts`
5. Test each repository independently

### Step 4: Create Storage Manager

1. Create `storage/StorageManager.ts`
2. Implement IStorage interface
3. Delegate to repositories

### Step 5: Update ContextManager

1. Update imports in `ContextManager.ts`
2. Use new StorageManager instead of SQLiteStorage
3. Test integration

### Step 6: Delete Old File

1. Delete `context/storage.ts` (672 lines)
2. Run all tests
3. Verify no regressions

## Testing Plan

### Mapper Tests (~16 tests)

- ✅ ConversationMapper: toDomain, toRow
- ✅ MessageMapper: toDomain, toRow
- ✅ FileContextMapper: toDomain, toRow
- ✅ SessionMapper: toDomain, toRow

### Repository Tests (~40 tests)

- ✅ ConversationRepository: create, findById, update, delete
- ✅ MessageRepository: save, findByConversationId, search
- ✅ FileContextRepository: track, getContext, saveEdit
- ✅ SessionRepository: create, findById, update, getAll, delete

### Integration Tests (~10 tests)

- ✅ StorageManager delegates correctly
- ✅ ContextManager works with new storage
- ✅ Full workflow: create conversation → add messages → search
- ✅ Session management end-to-end
- ✅ File tracking end-to-end

## Expected Outcomes

### Metrics

- **Lines of Code**: 672 → ~845 lines (+26%)
- **Number of Files**: 1 → 14 files
- **Responsibilities per File**: ~5 → 1 (80% reduction in complexity)
- **Testability**: Hard → Easy (mock individual repositories)
- **Modification Risk**: High → Low (changes isolated)

### Quality Improvements

1. ✅ **Single Responsibility**: Each repository manages ONE entity
2. ✅ **Testability**: Test repositories independently
3. ✅ **Maintainability**: Changes don't affect other entities
4. ✅ **Reusability**: Use repositories in different contexts
5. ✅ **Abstraction**: Hide database implementation

### Before/After Comparison

#### Before (God Class)

```typescript
class SQLiteStorage {
  // Everything in one class (672 lines)
  async createConversation() {
    /* ... */
  }
  async saveMessage() {
    /* ... */
  }
  async createSession() {
    /* ... */
  }
  // Changes to one feature risk breaking others
}
```

#### After (Repository Pattern)

```typescript
// Separate repositories (each ~100-120 lines)
class ConversationRepository {
  async create() {
    /* Focused on conversations */
  }
}

class MessageRepository {
  async save() {
    /* Focused on messages */
  }
}

class SessionRepository {
  async create() {
    /* Focused on sessions */
  }
}

// StorageManager combines them
class StorageManager {
  constructor() {
    this.conversations = new ConversationRepository(db);
    this.messages = new MessageRepository(db);
    this.sessions = new SessionRepository(db);
  }
}
```

## Connection to Previous Phases

### Phase 6: Strategy Pattern (Formatters)

- **Pattern**: Swappable formatting strategies
- **Benefit**: Different formats without changing code

### Phase 7: Single Responsibility (Execution)

- **Pattern**: Parser separate from executor
- **Benefit**: Isolated, testable units

### Phase 8: Chain of Responsibility (Parsing)

- **Pattern**: Chain of handlers for fallbacks
- **Benefit**: Flexible, extensible pipeline

### Phase 9: Repository Pattern (Storage)

- **Pattern**: One repository per entity
- **Benefit**: Isolated data access, easy testing

### Common Thread: Composing Software

All phases follow Eric Elliott's principles:

1. **Small, focused units** (SRP everywhere)
2. **Composition over inheritance** (All patterns)
3. **Testability through isolation** (Mock individual pieces)
4. **Clear contracts** (Interfaces and types)

## Next Steps

1. ✅ Create `storage/database.ts`
2. ✅ Create mappers (Conversation, Message, FileContext, Session)
3. ✅ Create `storage/repositories/ConversationRepository.ts`
4. ✅ Create `storage/repositories/MessageRepository.ts`
5. ✅ Create `storage/repositories/FileContextRepository.ts`
6. ✅ Create `storage/repositories/SessionRepository.ts`
7. ✅ Create `storage/StorageManager.ts`
8. ✅ Create repository index files
9. ✅ Update `ContextManager.ts` imports
10. ✅ Write comprehensive tests
11. ✅ Delete old `storage.ts`
12. ✅ Verify integration

## Success Criteria

- ✅ All mapper tests passing
- ✅ All repository tests passing
- ✅ StorageManager implements IStorage correctly
- ✅ ContextManager works with new storage
- ✅ Build succeeds with no errors
- ✅ Existing functionality unchanged
- ✅ Code is more maintainable and testable
- ✅ Each repository has single, clear responsibility

---

**Ready to begin Phase 9!** Let's create focused, testable repositories using the Repository Pattern. This is the final phase of our refactoring journey! 🎯
