export const NO_PLAN_NEEDED = "NO_PLAN_NEEDED";

export const PLANNING_PROMPT = `Analyze the user's request. If it requires multiple steps or tool usage, create a detailed plan in JSON format:
{
  "goal": "brief description of the goal",
  "steps": [
    {"action": "what to do", "tool": "tool_name", "reasoning": "why this step"}
  ]
}

Available tools:
- read_file: Read the contents of a file
- list_files: List all files in a directory
- edit_file: Edit or create a file (creates parent directories automatically)
- create_directory: Create a new directory (use this when you need to create directories explicitly)

If the request is simple (like a question), respond with "NO_PLAN_NEEDED".`;

export const DEFAULT_MODEL = "deepseek/deepseek-chat";

export const DEFAULT_MAX_TOKENS = 4096;

export const PLANNING_MAX_TOKENS = 2048;

export const TOOL_NAMES = {
  READ_FILE: "read_file",
  LIST_FILES: "list_files",
  EDIT_FILE: "edit_file",
  CREATE_DIRECTORY: "create_directory",
} as const;
