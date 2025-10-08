# Terminal Coding Agent v2

An AI-powered coding assistant that helps you manipulate files and directories through natural language conversations. The agent creates execution plans, gets user approval, and executes file operations safely.

## Project Overview

This agent uses OpenAI's chat completion API (via OpenRouter) to understand user requests, create actionable plans, and execute file operations. It follows a plan-approve-execute workflow for safety and transparency.

---

## File Structure (src/ only)

```
src/
├── agent.ts                    # Main entry point - CLI interface & dependency injection
├── agent/
│   ├── agent.ts               # Core Agent class - orchestration only (123 lines)
│   ├── execution.ts           # Tool execution logic (pure functions)
│   ├── inference.ts           # AI inference logic (pure functions)
│   ├── planning.ts            # Plan creation and parsing logic
│   ├── formatter.ts           # Pure formatting functions for output
│   ├── types.ts               # TypeScript type definitions
│   ├── constants.ts           # Configuration constants (models, prompts)
│   ├── tools/
│   │   ├── index.ts           # Tool exports
│   │   ├── readFile.ts        # Reads file contents
│   │   ├── listFiles.ts       # Lists directory contents
│   │   ├── editFile.ts        # Edits/creates files (auto-creates parent dirs)
│   │   └── createDirectory.ts # Creates directories explicitly
│   └── utils/
│       └── pathValidation.ts  # File path validation helpers
```

---

## File Descriptions

### Core Files

#### `src/agent.ts` (Main Entry Point)

Main entry point that:

- Initializes OpenAI client with OpenRouter
- Sets up CLI interface with colored prompts
- Provides user interaction functions (getUserMessage, showAgentMessage, getToolConsent, getPlanApproval)
- Imports `formatToolConsentRequest` from formatter for clean tool request display
- Injects dependencies into the Agent class

#### `src/agent/agent.ts` (Core Agent Class)

The main Agent class using hybrid OOP + FP approach - **Orchestration Only (123 lines)**:

- **Class**: Manages conversation state and orchestration
- **Delegates All Logic**: To pure functions in separate modules
- **Clean Separation**: No business logic, only flow control
- **Methods**:
  - `run()`: Main loop
  - `handleUserInput()`: Gets user input and creates plan
  - `handlePlanApproval()`: Shows plan and gets approval
  - `processInference()`: Coordinates AI inference and tool execution

**Architecture**: Reduced from 225 lines to 123 lines (45% reduction) by moving logic to dedicated modules.

#### `src/agent/execution.ts` (Tool Execution Module)

Pure functions for tool execution:

- `parseToolArguments(argsString, toolName)`: Safely parses JSON arguments with error handling
- `createToolResponse(id, content)`: Creates tool response messages
- `executeSingleTool(tool, input, getConsent)`: Executes one tool with user consent
- `executeToolCall(id, name, input, tools, getConsent)`: Executes a single tool call
- `executeToolCalls(toolCalls, tools, getConsent)`: Executes all tool calls in sequence

**Why Separate?**:

- Easy to test tool execution in isolation
- Reusable across different agent implementations
- Clear separation of concerns

#### `src/agent/inference.ts` (AI Inference Module)

Pure functions for AI interaction:

- `buildToolsForAPI(tools)`: Converts tool definitions to OpenAI API format
- `runInference(client, conversation, tools, model, maxTokens)`: Calls OpenAI API
- `extractAssistantMessage(response)`: Extracts message from API response
- `hasToolCalls(message)`: Checks if message contains tool calls

**Why Separate?**:

- Encapsulates all OpenAI API interaction
- Easy to switch AI providers
- Simple to mock for testing

---

### Type Definitions

#### `src/agent/types.ts`

```typescript
// Tool definition structure
ToolDefinition {
  name: string
  description: string
  input_schema: { type, properties, required }
  func: (args) => Promise<string> | string
}

// Plan structure
Plan {
  goal: string
  steps: PlanStep[]
}

PlanStep {
  action: string
  tool: string
  reasoning: string
}

// Agent dependencies
AgentDependencies {
  client: OpenAI
  tools: ToolDefinition[]
  getUserMessage: () => Promise<string>
  showAgentMessage: (message: string) => void
  getToolConsent: (message: string) => Promise<boolean>
  getPlanApproval: (plan: string) => Promise<boolean>
}
```

---

### Utilities

#### `src/agent/constants.ts`

Application-wide constants:

- `NO_PLAN_NEEDED`: Marker for simple requests
- `PLANNING_PROMPT`: System prompt for plan generation
- `DEFAULT_MODEL`: AI model to use (nvidia/nemotron-nano-9b-v2:free)
- `DEFAULT_MAX_TOKENS`: 4096
- `PLANNING_MAX_TOKENS`: 2048

#### `src/agent/formatter.ts`

Pure formatting functions with ANSI color codes and icons:

- `formatPlan(plan)`: Formats plan with colorful output, icons (📋 🎯 ▶ 🔧 💡), and clear structure
- `formatPlanAsJson(plan)`: Returns plan as formatted JSON
- `formatPlanWithJson(plan)`: Shows both human-readable and JSON formats
- `formatToolResult(name, input, result)`: Formats tool execution results
- `formatError(toolName, error)`: Formats error messages

**Color Scheme**:

- Cyan: Plan borders and headers
- Yellow: Goal
- Green: Steps section
- Blue: Step numbers
- Dim gray: Reasoning text
- Red: Errors

**Icons**: 📋 Plan, 🎯 Goal, ▶ Step, 🔧 Tool, 💡 Reasoning, ✅ Success, ❌ Error

#### `src/agent/planning.ts`

Plan creation logic:

- `loadReadmeContext()`: Loads README.md for context in planning
- `extractJsonFromResponse(content)`: Extracts JSON from AI response
- `parsePlan(jsonString)`: Parses JSON into Plan object
- `isPlanNeeded(content)`: Checks if planning is needed
- `createPlanningPrompt(conversation)`: Creates planning prompt with README context
- `createPlan(client, conversation)`: Main function to create plans

**Special Feature**: Automatically includes README.md content as context when creating plans, helping the AI understand project structure and constraints.

---

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

### Modular Architecture (Hybrid OOP + FP)

The agent is built using a hybrid approach combining:

- **OOP**: For state management and orchestration
- **FP**: For business logic and transformations

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
```

### Benefits of This Architecture

✅ **Testability**: Pure functions easy to unit test  
✅ **Maintainability**: Changes isolated to specific modules  
✅ **Readability**: Each file has one clear purpose  
✅ **Reusability**: Functions can be used in different contexts  
✅ **Scalability**: Easy to add new modules or features

### Workflow

```
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
```

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

## Development Notes

### Current Implementation

Clean modular architecture with separation of concerns:

**Module Breakdown**:

- `agent/agent.ts` (123 lines): Orchestration only
- `agent/execution.ts` (131 lines): Tool execution logic
- `agent/inference.ts` (54 lines): AI inference logic
- `agent/planning.ts` (139 lines): Plan creation with validation
- `agent/formatter.ts` (278 lines): Output formatting & tool consent display
- `agent/utils/pathValidation.ts`: File path validation helpers

**Total**: ~725 lines across 6 focused modules

**Architecture Principles**:

- Separation of concerns
- Pure functions for transformations
- Class for state management only
- Better error handling
- Full type safety

---

## Future Enhancements

- [x] Add `create_directory` tool ✅
- [x] Implement file path validation (restrict to `src/`) ✅
- [ ] Add `delete_file` tool
- [ ] Add `rename_file` tool
- [ ] Add conversation history persistence
- [ ] Add token limit handling
- [ ] Add unit tests
- [ ] Add logging

---

## Security Considerations

1. **Path Validation**: Should validate paths are within `src/`
2. **API Key**: Never commit `.env` file
3. **User Consent**: Always ask before tool execution
4. **Plan Approval**: User reviews actions before execution
5. **Error Handling**: Graceful failure without exposing sensitive info

---

## License

MIT
