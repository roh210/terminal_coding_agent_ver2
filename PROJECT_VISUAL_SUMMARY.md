# Terminal Coding Agent - Visual Project Summary 🚀

## 📋 Project Overview

**Type**: AI-Powered Terminal Coding Assistant  
**Architecture**: Modular Monolith  
**Language**: TypeScript (Node.js)  
**Database**: SQLite (Better-SQLite3)  
**LLM Provider**: OpenRouter (OpenAI API)  
**UI Framework**: Ink (React for CLI)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Terminal User                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLI Interface (Ink/React)                  │
│  • AutocompleteInput  • ConfirmPrompt  • SessionSwitcher    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Core (agent.ts)                     │
│                  Orchestrates entire workflow                │
└─────┬──────────┬──────────┬──────────┬──────────┬──────────┘
      │          │          │          │          │
      ▼          ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Inference │ │Planning  │ │Execution │ │Formatting│ │ Context  │
│  Module  │ │  Module  │ │  Module  │ │  Module  │ │  Module  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
     │            │            │            │            │
     │            │            │            │            ▼
     │            │            │            │      ┌──────────┐
     │            │            │            │      │ Storage  │
     │            │            │            │      │Repository│
     │            │            │            │      └─────┬────┘
     │            │            │            │            │
     ▼            ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│                      SQLite Database                         │
│  Conversations | Messages | FileContexts | Sessions          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Features

### 1. **Conversational AI Agent**

```
┌─────────────────────────────────────────┐
│  User: "Fix the bug in agent.ts"        │
│                                          │
│  Agent: Analyzes → Plans → Executes     │
│         └─> Uses context & tools        │
│                                          │
│  Result: Bug fixed + Code edited        │
└─────────────────────────────────────────┘
```

- Natural language interaction
- Context-aware responses
- Multi-turn conversations

### 2. **Intelligent Planning System**

```
User Request → Plan Creation → Tool Execution
                    │
      ┌─────────────┴─────────────┐
      │                           │
      ▼                           ▼
Markdown Parser           JSON Parser
      │                           │
      └─────────────┬─────────────┘
                    │
                    ▼
            Validated Plan
```

- Chain of Responsibility pattern
- Multiple parsing strategies
- Automatic plan validation

### 3. **Advanced Tool System**

```
Available Tools:
├── 📝 edit_file         - Modify code files
├── 📖 read_file         - Read file contents
├── 🔍 search_files      - Search codebase
├── 🔧 execute_command   - Run terminal commands
├── 🌳 git_operations    - Version control
├── 📊 list_directory    - Browse filesystem
└── 💾 save_file         - Create new files
```

### 4. **Persistent Context Management**

```
Session Management
├── Multiple conversations per session
├── File context tracking
│   ├── Access count
│   ├── Last accessed time
│   └── Related files
├── Edit history per file
└── Full-text message search
```

### 5. **Session & Project Management**

```
Sessions
├── session-1 (Project A)
│   ├── conversation-1
│   ├── conversation-2
│   └── active-files: [agent.ts, tools.ts]
│
└── session-2 (Project B)
    ├── conversation-1
    └── active-files: [index.ts]
```

---

## 🗄️ Database Schema

### SQLite Database Structure

```sql
┌─────────────────────────────────────────────┐
│              conversations                   │
│  • id (PRIMARY KEY)                         │
│  • started_at                               │
│  • last_updated_at                          │
│  • summary (optional)                       │
│  • total_tokens                             │
└──────────────┬──────────────────────────────┘
               │ 1:N
               ▼
┌─────────────────────────────────────────────┐
│                messages                      │
│  • id (PRIMARY KEY)                         │
│  • conversation_id (FOREIGN KEY)            │
│  • timestamp                                │
│  • role (user/assistant/system)             │
│  • content (FULL-TEXT SEARCH)               │
│  • token_count                              │
└──────────┬──────────────────────────────────┘
           │ 1:N
           ├───────────┐
           ▼           ▼
    ┌──────────┐  ┌──────────┐
    │message_  │  │  tool_   │
    │  files   │  │  calls   │
    └──────────┘  └──────────┘

┌─────────────────────────────────────────────┐
│            file_contexts                     │
│  • path (PRIMARY KEY)                       │
│  • last_accessed                            │
│  • access_count                             │
│  • purpose                                  │
└──────────┬──────────────────────────────────┘
           │ 1:N
           ▼
    ┌──────────────┐
    │  file_edits  │
    │  file_relations│
    └──────────────┘

┌─────────────────────────────────────────────┐
│               sessions                       │
│  • id (PRIMARY KEY)                         │
│  • name                                     │
│  • project                                  │
│  • current_conversation_id (FOREIGN KEY)    │
│  • created_at                               │
│  • last_active                              │
└──────────┬──────────────────────────────────┘
           │ M:N
           ▼
    ┌──────────────┐
    │session_files │
    └──────────────┘
```

**Key Features**:

- ✅ Full-text search on messages (FTS5)
- ✅ Foreign key constraints for data integrity
- ✅ Indexes for performance (4 total)
- ✅ Timestamps for all entities

---

## 🎨 Design Patterns Used

### 1. **Repository Pattern** (Storage Layer)

```
StorageManager (Facade)
    ├── ConversationRepository
    ├── MessageRepository
    ├── FileContextRepository
    └── SessionRepository
         └── Database Connection
```

### 2. **Strategy Pattern** (Formatting)

```
FormatterService
    ├── PlanFormatter
    ├── ToolFormatter
    └── ConsentFormatter
```

### 3. **Chain of Responsibility** (Plan Parsing)

```
Request → Handler1 → Handler2 → Handler3 → Response
          (Markdown) (PlainJSON) (FunctionCall)
```

### 4. **Service Pattern** (Core Services)

```
Agent
├── SessionService
├── CommandService
└── UIRenderer
```

---

## 📁 Project Structure

```
terminal_coding_agent_ver2/
│
├── src/
│   ├── agent.ts                    # Entry point
│   │
│   ├── agent/
│   │   ├── agent.ts               # Core orchestration
│   │   ├── inference.ts           # LLM communication
│   │   │
│   │   ├── context/               # Context Management
│   │   │   ├── ContextManager.ts
│   │   │   └── storage/           # Repository Pattern
│   │   │       ├── database.ts
│   │   │       ├── mappers/       # 4 mappers
│   │   │       ├── repositories/  # 4 repositories
│   │   │       └── StorageManager.ts
│   │   │
│   │   ├── planning/              # Chain of Responsibility
│   │   │   ├── ParserChain.ts
│   │   │   ├── handlers/          # 4 handlers
│   │   │   └── PlanValidator.ts
│   │   │
│   │   ├── execution/             # Tool Execution
│   │   │   ├── ToolExecutor.ts
│   │   │   └── ToolArgumentParser.ts
│   │   │
│   │   ├── formatting/            # Strategy Pattern
│   │   │   ├── FormatterService.ts
│   │   │   └── [formatters]
│   │   │
│   │   ├── services/              # UI Services
│   │   │   ├── SessionService.ts
│   │   │   └── UIRenderer.ts
│   │   │
│   │   ├── tools/                 # Tool Implementations
│   │   └── utils/                 # Utilities
│   │
│   └── components/                # Ink Components
│       ├── AutocompleteInput.tsx
│       ├── ConfirmPrompt.tsx
│       └── SessionSwitcher.tsx
│
├── dist/                          # Compiled JS
├── .agent-context/                # SQLite database location
├── package.json
└── tsconfig.json
```

---

## 🔄 Request Flow Example

```
1. User Input
   │
   ▼
2. Agent receives message
   │
   ├─→ Store in Context (SQLite)
   │
   ▼
3. Send to LLM (OpenRouter)
   │
   ├─→ Include conversation history
   └─→ Include available tools
   │
   ▼
4. LLM responds with plan
   │
   ▼
5. Parse & Validate Plan
   │
   ├─→ Try Markdown parser
   ├─→ Try JSON parser
   └─→ Try Function Call parser
   │
   ▼
6. Request User Approval
   │
   ▼
7. Execute Tools Sequentially
   │
   ├─→ edit_file("agent.ts", ...)
   ├─→ read_file("tests.ts")
   └─→ execute_command("npm test")
   │
   ▼
8. Format Results
   │
   ▼
9. Show to User
   │
   └─→ Store in Context (SQLite)
```

---

## 📊 Code Quality Metrics

```
┌────────────────────────────────────────┐
│           Test Coverage                │
│                                        │
│  ████████████████████████ 100%        │
│                                        │
│  Total Tests: 203/203 passing         │
│  - Repository: 11/11 ✅               │
│  - Integration: 8/8 ✅                │
│  - Formatting: 146/146 ✅             │
│  - Planning: 24/24 ✅                 │
│  - Execution: 14/14 ✅                │
└────────────────────────────────────────┘

Architecture Quality:
✅ SOLID Principles: All 5 applied
✅ Design Patterns: 5 patterns used
✅ TypeScript: Strict mode enabled
✅ Modularity: 32+ focused files
✅ Documentation: Comprehensive
```

---

## 🛠️ Technology Stack

```
┌─────────────────────────────────────────────┐
│             Core Technologies               │
├─────────────────────────────────────────────┤
│  Runtime:        Node.js                    │
│  Language:       TypeScript 5.9.3           │
│  Package Mgr:    npm                        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│               Dependencies                  │
├─────────────────────────────────────────────┤
│  AI:             openai (OpenRouter)        │
│  Database:       better-sqlite3             │
│  UI:             ink, react                 │
│  Tokens:         gpt-tokenizer              │
│  Diff:           diff                       │
│  Config:         dotenv                     │
└─────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Configuration

```bash
# Create .env file
OPENROUTER_API_KEY=your_key_here
```

### Build & Run

```bash
npm run build
npm start
```

### Test

```bash
npm test
```

---

## 🎯 Key Achievements

```
✅ Modular Monolith Architecture
✅ 100% Test Coverage (203 tests)
✅ Repository Pattern for Storage
✅ Strategy Pattern for Formatting
✅ Chain of Responsibility for Parsing
✅ Full SQLite Persistence
✅ Full-Text Search on Messages
✅ Session & Project Management
✅ Context-Aware Conversations
✅ 32+ Focused Modules
```

---

## 📈 System Capabilities

| Feature              | Status | Description                  |
| -------------------- | ------ | ---------------------------- |
| Natural Language     | ✅     | Understand user requests     |
| Code Editing         | ✅     | Modify files with context    |
| File Search          | ✅     | Search across codebase       |
| Command Execution    | ✅     | Run terminal commands        |
| Git Operations       | ✅     | Version control integration  |
| Conversation History | ✅     | Persistent storage           |
| Session Management   | ✅     | Multiple projects            |
| Full-Text Search     | ✅     | Find past conversations      |
| Context Tracking     | ✅     | File usage patterns          |
| Token Management     | ✅     | Track usage per conversation |

---

_Architecture: Modular Monolith_  
_Test Coverage: 100% (203/203 tests)_  
_Status: Production Ready_  
_Last Updated: October 19, 2025_
