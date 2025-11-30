## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenRouter API key (get free at [openrouter.ai](https://openrouter.ai))

### Installation

```bash
# Clone repository
git clone <repository-url>
cd terminal_coding_agent_ver2

# Install dependencies
npm install

# Set up API key
export OPENROUTER_API_KEY="your-key-here"  # Linux/Mac
# OR
$env:OPENROUTER_API_KEY="your-key-here"    # Windows PowerShell

# Run the agent
npm start
```

### First Run

On first run, the agent:

1. Detects your current project (based on `cwd`)
2. Creates a session in `.agent-sessions/` directory
3. Initializes SQLite database for context tracking
4. Ready to accept commands!

---

## 💬 Slash Commands

Quick access to agent features:

| Command     | Description                | Example                    |
| ----------- | -------------------------- | -------------------------- |
| `/help`     | Show available commands    | Just type `/help`          |
| `/sessions` | Switch between projects    | Interactive session picker |
| `/history`  | View conversation history  | Search past messages       |
| `/clear`    | Clear current conversation | Start fresh                |

**Examples**:

```bash
You: /sessions
# Opens interactive session switcher with autocomplete

You: /history search "created file"
# Searches past conversations for "created file"

You: /help
# Shows all available commands
```

See [SLASH_COMMANDS_GUIDE.md](./SLASH_COMMANDS_GUIDE.md) for detailed documentation.

## Available Tools

### 1. `read_file`

**Purpose**: Read contents of a file  
**Parameters**:

- `path` (string, required): Relative path to file

**Example**:

```json
{ "path": "src/agent.ts" }
```

**Returns**: File contents as UTF-8 string

**Errors**:

- File doesn't exist
- Path is a directory, not a file

---

### 2. `list_files`

**Purpose**: List all files and directories in a folder  
**Parameters**:

- `path` (string, required): Relative path to directory (use "." for current)
- `showHidden` (boolean, optional): Show hidden files (default: false)

**Example**:

```json
{ "path": "src", "showHidden": false }
```

**Returns**: List of files/directories (directories end with `/`)

**Errors**:

- Directory doesn't exist
- Path is a file, not a directory

---

### 3. `edit_file`

**Purpose**: Edit file contents (create or modify)  
**Parameters**:

- `path` (string, required): Relative path to file
- `content` (string, required): New content for the file

**Example**:

```json
{
  "path": "test.txt",
  "content": "Hello World!"
}
```

**Returns**: Success message

**Errors**:

- Permission denied
- Invalid path

---

### 4. `create_directory`

**Purpose**: Create a new directory (and parent directories if needed)  
**Parameters**:

- `path` (string, required): Relative path to directory to create

**Example**:

```json
{ "path": "src/agent/utils" }
```

**Returns**: Success message with absolute path

**Behavior**:

- Creates parent directories automatically (like `mkdir -p`)
- No error if directory already exists
- Creates intermediate directories as needed

**Note**: The `edit_file` tool also auto-creates parent directories when creating files, so you only need `create_directory` when creating empty directories.

**Errors**:

- Permission denied
- Invalid path

---

## Agent Architecture
```
┌─────────────────────────────────────────────────┐
│         agent/agent.ts (Orchestrator)           │
│  • Manages conversation state                   │
│  • Controls execution flow                      │
│  • Delegates all logic to pure functions        │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ planning.ts  │ │ infer.ts │ │ execution.ts │
│              │ │          │ │              │
│ • Create     │ │ • Build  │ │ • Parse args │
│   plans      │ │   API    │ │ • Execute    │
│ • Parse JSON │ │   tools  │ │   tools      │
│ • Load       │ │ • Call   │ │ • Handle     │
│   context    │ │   OpenAI │ │   consent    │
└──────────────┘ └──────────┘ └──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │ formatter.ts │
              │              │
              │ • Format     │
              │   plans      │
              │ • Format     │
              │   results    │
              │ • Colorize   │
              └──────────────┘
1. User Input
   ↓
2. Plan Creation (if complex request)
   ↓
3. Show Plan to User
   ↓
4. User Approves/Rejects
   ↓
5. If Approved: Execute Tools
   ↓
6. Show Results
   ↓
7. AI Summarizes

### Plan-Approve-Execute Pattern

**Planning Phase**:

- AI analyzes user request
- Creates structured plan with goal and steps
- Each step includes: action, tool, reasoning

**Approval Phase**:

- Plan displayed to user in cyan
- User types "yes" or presses Enter to approve
- User types "no" to reject and refine request

**Execution Phase**:

- Each tool asks for individual consent
- Tools execute in sequence
- Results formatted and displayed
- AI provides final summary

### Skip Planning For:

- Simple questions ("What files are in src?")
- Clarification requests
- General conversation

---

## Important Constraints

### ⚠️ File Scope

**The agent should ONLY manipulate files within the `src/` directory.**

Reasons:

- Safety: Prevent accidental modification of system files
- Focus: Keep changes within project source code
- Security: Avoid path traversal attacks

### ✅ Allowed Operations

- Read files in `src/`
- List directories in `src/`
- Edit/create files in `src/`

### ❌ Forbidden Operations

- Modify `package.json`, `tsconfig.json`, `.env`
- Access files outside workspace
- Delete files (tool not implemented)
- Execute shell commands

---

## Usage

### Installation

```bash
npm install
```

### Build

```bash
npm run build
```

### Run

```bash
npm run dev
```

### Example Interactions

**Simple Question (No Plan)**:

```
You: What files are in the src directory?
→ AI lists files directly
```

**Complex Request (With Plan)**:

```
You: Create a new utility file in src/utils with helper functions
→ AI shows plan
→ You approve
→ AI executes: list_files → edit_file
→ AI confirms completion
```

**Plan Rejection**:

```
You: Delete all test files
→ AI shows plan
→ You reject (type "no")
→ AI asks for refinement
```

---

## Configuration

Edit `src/agent/constants.ts` to change:

- AI model (`DEFAULT_MODEL`)
- Token limits (`DEFAULT_MAX_TOKENS`, `PLANNING_MAX_TOKENS`)
- Planning prompt (`PLANNING_PROMPT`)

Environment variables in `.env`:

```
OPENROUTER_API_KEY=your_api_key_here
```

---


