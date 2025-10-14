export const NO_PLAN_NEEDED = "NO_PLAN_NEEDED";

export const PLANNING_PROMPT = `You are a planning assistant. Your ONLY job is to output valid JSON.

User request requires action? Output this EXACT JSON format (replace values with actual plan):
{
  "goal": "description of what to accomplish",
  "steps": [
    {"action": "specific action to take", "tool": "tool_name", "reasoning": "why needed"}
  ]
}

User request is just a question? Output exactly: NO_PLAN_NEEDED

Available tools: read_file, list_files, edit_file, create_directory, undo_edit, show_diff, list_recent_edits, debug_buffer, run_shell_command, execute_sandbox_code

CRITICAL RULES:
1. Output ONLY valid JSON or "NO_PLAN_NEEDED"
2. NO markdown, NO code blocks, NO explanations, NO extra text
3. NO "=== PLAN ===" headers
4. NO "!function_call" or other formats
5. JUST the raw JSON object starting with { and ending with }

Example valid response:
{"goal":"Create test file","steps":[{"action":"Create new file","tool":"edit_file","reasoning":"Need file to write code"}]}`;

export const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet";

export const DEFAULT_MAX_TOKENS = 4096;

export const PLANNING_MAX_TOKENS = 2048;

export const TOOL_NAMES = {
  READ_FILE: "read_file",
  LIST_FILES: "list_files",
  EDIT_FILE: "edit_file",
  CREATE_DIRECTORY: "create_directory",
  UNDO_EDIT: "undo_edit",
  SHOW_DIFF: "show_diff",
  LIST_RECENT_EDITS: "list_recent_edits",
  DEBUG_BUFFER: "debug_buffer",
  RUN_SHELL_COMMAND: "run_shell_command",
  EXECUTE_SANDBOX_CODE: "execute_sandbox_code",
} as const;

export const COLORS = {
  cyan: "\u001b[36m",
  yellow: "\u001b[33m",
  green: "\u001b[32m",
  red: "\u001b[91m",
  gray: "\u001b[90m",
  brightCyan: "\u001b[96m",
  brightYellow: "\u001b[93m",
  brightGreen: "\u001b[92m",
  brightMagenta: "\u001b[95m",
  blue: "\u001b[34m",
  brightBlue: "\u001b[94m",
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
} as const;

export const SEPARATOR = "=".repeat(60);

export const ICONS = {
  plan: "📋",
  goal: "🎯",
  step: "▶",
  tool: "🔧",
  reasoning: "💡",
  success: "✅",
  error: "❌",
  warning: "⚠️",
} as const;
