import { COLORS, ICONS } from "../constants.js";

/**
 * Converts !function_call format to plan format
 * Handles cases where AI returns function calling format instead of plan JSON
 * 
 * This is a fallback for when the AI ignores the planning prompt and uses
 * the function calling format instead of the expected plan JSON structure.
 */
export const convertFunctionCallToPlan = (content: string): string | null => {
  // Try to find function_call pattern (with or without ! prefix)
  const functionCallPrefix = content.indexOf("function_call:");

  if (functionCallPrefix !== -1) {
    // Find the start of the JSON object after "function_call:"
    const jsonStart = content.indexOf("{", functionCallPrefix);

    if (jsonStart !== -1) {
      // Use brace counting to find the complete JSON object
      const jsonString = extractJsonWithBraceCounting(content, jsonStart);

      if (jsonString) {
        return parseFunctionCallJson(jsonString);
      }
    }
  }

  // Fallback: try to match raw JSON with "call" and "arguments" fields
  const callIndex = content.indexOf('"call"');
  if (callIndex !== -1) {
    // Find the opening brace before "call"
    const jsonStart = content.lastIndexOf("{", callIndex);

    if (jsonStart !== -1) {
      const jsonString = extractJsonWithBraceCounting(content, jsonStart);

      if (jsonString) {
        return parseRawFunctionCallJson(jsonString);
      }
    }
  }

  return null;
};

/**
 * Extracts a complete JSON object using brace counting
 * Handles nested objects properly
 */
function extractJsonWithBraceCounting(
  content: string,
  startIndex: number
): string | null {
  let braceCount = 0;
  let jsonEnd = -1;

  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === "{") braceCount++;
    if (content[i] === "}") braceCount--;

    if (braceCount === 0) {
      jsonEnd = i;
      break;
    }
  }

  if (jsonEnd === -1) {
    return null;
  }

  return content.substring(startIndex, jsonEnd + 1);
}

/**
 * Parses a function_call JSON string and converts to plan format
 */
function parseFunctionCallJson(jsonString: string): string | null {
  try {
    const functionCall = JSON.parse(jsonString);

    if (!functionCall.call && !functionCall.id) {
      console.log(
        `${COLORS.red}${ICONS.error} Invalid function_call format${COLORS.reset}`
      );
      return null;
    }

    const toolName = functionCall.call || functionCall.id;
    const args = functionCall.arguments || {};

    console.log(
      `${COLORS.green}${ICONS.success} Converting function_call: ${toolName}${COLORS.reset}`
    );
    return convertToPlannFormat(toolName, args);
  } catch (error) {
    console.log(
      `${COLORS.red}${ICONS.error} Failed to parse function_call JSON:${COLORS.reset}`,
      error
    );
    return null;
  }
}

/**
 * Parses raw JSON with "call" field (no function_call prefix)
 */
function parseRawFunctionCallJson(jsonString: string): string | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.call && parsed.arguments) {
      console.log(
        `${COLORS.yellow}${ICONS.warning} Found function_call JSON (without prefix)${COLORS.reset}`
      );
      return convertToPlannFormat(parsed.call, parsed.arguments);
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Converts a tool call to plan format with proper structure
 */
function convertToPlannFormat(
  toolName: string,
  args: Record<string, unknown>
): string {
  // Create a human-readable goal based on the tool
  const goalMap: Record<string, string> = {
    read_file: `Read file: ${(args.path as string) || "file"}`,
    list_files: `List files in: ${(args.path as string) || "directory"}`,
    edit_file: `Edit file: ${(args.path as string) || "file"}`,
    create_directory: `Create directory: ${
      (args.path as string) || "directory"
    }`,
  };

  const goal = goalMap[toolName] || `Execute ${toolName}`;

  const plan = {
    goal: goal,
    steps: [
      {
        action: goal,
        tool: toolName,
        reasoning: "Direct tool execution from AI function call",
      },
    ],
  };

  return JSON.stringify(plan);
}
