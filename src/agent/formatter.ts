import { Plan, ToolInput } from "./types.js";
import { COLORS, SEPARATOR, ICONS } from "./constants.js";

/**
 * Formats a plan into a human-readable, colorful string
 */
export const formatPlan = (plan: Plan): string => {
  // Validate plan structure
  if (!plan || !plan.goal || !plan.steps || !Array.isArray(plan.steps)) {
    return `\n${COLORS.red}${ICONS.error} Invalid plan structure${COLORS.reset}\n`;
  }

  const lines: string[] = [];

  // Header with separator
  lines.push("");
  lines.push(`${COLORS.brightCyan}${SEPARATOR}${COLORS.reset}`);
  lines.push(
    `${COLORS.brightCyan}${COLORS.bold}${ICONS.plan} EXECUTION PLAN${COLORS.reset}`
  );
  lines.push(`${COLORS.brightCyan}${SEPARATOR}${COLORS.reset}`);
  lines.push("");

  // Goal
  lines.push(`${COLORS.brightYellow}${ICONS.goal} Goal:${COLORS.reset}`);
  lines.push(`  ${COLORS.yellow}${plan.goal}${COLORS.reset}`);
  lines.push("");

  // Steps
  lines.push(
    `${COLORS.brightGreen}${COLORS.bold}Steps to Execute:${COLORS.reset}`
  );
  lines.push("");

  plan.steps.forEach((step, index) => {
    // Step number and action
    lines.push(
      `${COLORS.brightBlue}${ICONS.step} Step ${index + 1}:${COLORS.reset} ${
        COLORS.bold
      }${step.action}${COLORS.reset}`
    );

    // Tool
    lines.push(
      `  ${COLORS.brightGreen}${ICONS.tool} Tool:${COLORS.reset} ${COLORS.cyan}${step.tool}${COLORS.reset}`
    );

    // Reasoning
    lines.push(
      `  ${COLORS.brightYellow}${ICONS.reasoning} Reasoning:${COLORS.reset} ${COLORS.dim}${step.reasoning}${COLORS.reset}`
    );
    lines.push("");
  });

  // Footer
  lines.push(`${COLORS.brightCyan}${SEPARATOR}${COLORS.reset}`);
  lines.push(
    `${COLORS.gray}${COLORS.dim}Total Steps: ${plan.steps.length}${COLORS.reset}`
  );
  lines.push(`${COLORS.brightCyan}${SEPARATOR}${COLORS.reset}`);

  return lines.join("\n");
};

/**
 * Strips ANSI color codes from a string
 */
const stripAnsiCodes = (text: string): string => {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, "");
};

/**
 * Formats a plan as plain text (no ANSI colors) for conversation history
 */
export const formatPlanPlainText = (plan: Plan): string => {
  const lines: string[] = [];

  lines.push("");
  lines.push("=== EXECUTION PLAN ===");
  lines.push("");
  lines.push(`Goal: ${plan.goal}`);
  lines.push("");
  lines.push("Steps to Execute:");
  lines.push("");

  plan.steps.forEach((step, index) => {
    lines.push(`Step ${index + 1}: ${step.action}`);
    lines.push(`  Tool: ${step.tool}`);
    lines.push(`  Reasoning: ${step.reasoning}`);
    lines.push("");
  });

  lines.push(`Total Steps: ${plan.steps.length}`);
  lines.push("");

  return lines.join("\n");
};

/**
 * Formats a plan as JSON for execution
 */
export const formatPlanAsJson = (plan: Plan): string => {
  return JSON.stringify(plan, null, 2);
};

/**
 * Shows plan in both human-readable and JSON format
 */
export const formatPlanWithJson = (plan: Plan): string => {
  const humanReadable = formatPlan(plan);
  const json = formatPlanAsJson(plan);

  return `${humanReadable}\n\n${COLORS.gray}${COLORS.dim}JSON Representation:${COLORS.reset}\n${COLORS.cyan}${json}${COLORS.reset}\n`;
};

/**
 * Type guard to check if input has a path property
 */
const hasPath = (input: ToolInput): input is { path: string } => {
  return "path" in input && typeof input.path === "string";
};

/**
 * Formats the result of a read_file tool call
 */
const formatReadFileResult = (input: ToolInput, result: string): string => {
  const filePath = hasPath(input) ? input.path : "unknown";
  let formatted = `${COLORS.yellow}=== File: ${filePath}${COLORS.reset}\n`;
  formatted += `${COLORS.cyan}${SEPARATOR}${COLORS.reset}\n`;
  formatted += `${result}\n`;
  formatted += `${COLORS.cyan}${SEPARATOR}${COLORS.reset}\n`;
  formatted += `${COLORS.gray}(${result.length} characters)${COLORS.reset}\n`;
  return formatted;
};

/**
 * Formats the result of a list_files tool call
 */
const formatListFilesResult = (input: ToolInput, result: string): string => {
  const dirPath = hasPath(input) ? input.path || "." : ".";
  let formatted = `${COLORS.yellow}=== Directory: ${dirPath}${COLORS.reset}\n`;
  formatted += `${COLORS.cyan}${SEPARATOR}${COLORS.reset}\n`;
  const files = result.split("\n").filter((f) => f.trim());
  files.forEach((file) => {
    formatted += `  ${file}\n`;
  });
  formatted += `${COLORS.cyan}${SEPARATOR}${COLORS.reset}\n`;
  formatted += `${COLORS.gray}(${files.length - 1} items)${COLORS.reset}\n`;
  return formatted;
};

/**
 * Formats the result of an edit_file tool call
 */
const formatEditFileResult = (input: ToolInput, result: string): string => {
  const editedFile = hasPath(input) ? input.path : "unknown";
  let formatted = `${COLORS.yellow}=== Edited: ${editedFile}${COLORS.reset}\n`;
  formatted += `${COLORS.cyan}${SEPARATOR}${COLORS.reset}\n`;
  formatted += `${COLORS.green}${result}${COLORS.reset}\n`;
  formatted += `${COLORS.cyan}${SEPARATOR}${COLORS.reset}\n`;
  return formatted;
};

/**
 * Formats a generic tool result
 */
const formatGenericResult = (_input: ToolInput, result: string): string => {
  // Ensure result is a string (defensive coding)
  const resultStr =
    typeof result === "string" ? result : JSON.stringify(result, null, 2);
  return `${resultStr}\n${COLORS.cyan}${SEPARATOR}${COLORS.reset}\n`;
};

/**
 * Main formatter that routes to specific formatters based on tool name
 */
export const formatToolResult = (
  toolName: string,
  input: ToolInput,
  result: string
): string => {
  let formatted = `\n${COLORS.cyan}${SEPARATOR}${COLORS.reset}\n`;
  formatted += `${COLORS.cyan}=== Tool: ${toolName}${COLORS.reset}\n`;
  formatted += `${COLORS.cyan}${SEPARATOR}${COLORS.reset}\n`;

  const formatters: Record<
    string,
    (input: ToolInput, result: string) => string
  > = {
    read_file: formatReadFileResult,
    list_files: formatListFilesResult,
    edit_file: formatEditFileResult,
  };

  const formatter = formatters[toolName] || formatGenericResult;
  formatted += formatter(input, result);

  return formatted;
};

/**
 * Formats an error message
 */
export const formatError = (toolName: string, errorMessage: string): string => {
  return `\n${COLORS.red}!!! Error in ${toolName}: ${errorMessage}${COLORS.reset}\n`;
};

/**
 * Formats tool consent requests to make them more readable
 * Handles all tools with appropriate formatting and colors
 */
export const formatToolConsentRequest = (
  toolName: string,
  args: Record<string, unknown>
): string => {
  try {
    switch (toolName) {
      case "read_file":
        return `${COLORS.cyan}${toolName}${COLORS.reset}(${COLORS.yellow}"${args.path}"${COLORS.reset})`;

      case "list_files":
        const listPath = args.path || ".";
        return `${COLORS.cyan}${toolName}${COLORS.reset}(${COLORS.yellow}"${listPath}"${COLORS.reset})`;

      case "create_directory":
        return `${COLORS.cyan}${toolName}${COLORS.reset}(${COLORS.yellow}"${args.path}"${COLORS.reset})`;

      case "edit_file":
        // Handle long new_str content
        const isCreating = args.old_str === "";
        const operation = isCreating ? "Create" : "Edit";
        const newStr = args.new_str as string;

        if (newStr && newStr.length > 100) {
          const lineCount = (newStr.match(/\\n/g) || []).length + 1;
          return `${COLORS.cyan}${toolName}${COLORS.reset}(${COLORS.yellow}"${args.path}"${COLORS.reset}) - ${operation} file with ${COLORS.green}${lineCount} lines${COLORS.reset} (${COLORS.gray}${newStr.length} chars${COLORS.reset})`;
        } else if (isCreating) {
          return `${COLORS.cyan}${toolName}${COLORS.reset}(${COLORS.yellow}"${args.path}"${COLORS.reset}) - Create new file`;
        } else {
          return `${COLORS.cyan}${toolName}${COLORS.reset}(${COLORS.yellow}"${args.path}"${COLORS.reset}) - Replace text`;
        }

      default:
        // For unknown tools, show full JSON if short, truncate if long
        const argsJson = JSON.stringify(args);
        if (argsJson.length < 200) {
          return `${toolName}(${argsJson})`;
        }
        return `${toolName}(<${argsJson.length} chars>)`;
    }
  } catch (error) {
    // If formatting fails, return simple format
    return `${toolName}(${JSON.stringify(args)})`;
  }
};
