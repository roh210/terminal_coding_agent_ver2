import { Plan } from "../types.js";
import { COLORS, ICONS } from "../constants.js";
import { convertFunctionCallToPlan } from "./fallbackConverter.js";

/**
 * Extracts JSON from a string response
 * Handles markdown code blocks, function calls, and plain JSON
 *
 * This function attempts multiple strategies:
 * 1. Extract from markdown code blocks
 * 2. Use brace counting for plain JSON
 * 3. Validate the JSON has plan structure
 * 4. Fallback to function_call converter if needed
 */
export const extractJsonFromResponse = (content: string): string | null => {
  // Remove any "=== PLAN ===" style headers and extra text
  let cleanContent = content.replace(/===.*?===/g, "");

  // Remove "!function_call:" prefix if present
  cleanContent = cleanContent.replace(/!function_call:\s*/g, "");
  console.log(`${COLORS.gray}After cleaning:${COLORS.reset}`, cleanContent);

  // Try to extract JSON from markdown code blocks first
  const fromCodeBlock = extractFromMarkdownCodeBlock(cleanContent);
  if (fromCodeBlock) {
    return fromCodeBlock;
  }

  // Try to extract plain JSON using brace counting
  const fromPlainJson = extractPlainJson(cleanContent, content);
  if (fromPlainJson) {
    return fromPlainJson;
  }

  return null;
};

/**
 * Attempts to extract JSON from markdown code blocks
 */
function extractFromMarkdownCodeBlock(content: string): string | null {
  const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);

  if (codeBlockMatch) {
    console.log(
      `${COLORS.green}${ICONS.success} Found JSON in code block${COLORS.reset}`
    );
    return codeBlockMatch[1];
  }

  return null;
}

/**
 * Extracts plain JSON using brace counting
 */
function extractPlainJson(
  cleanContent: string,
  originalContent: string
): string | null {
  const startIndex = cleanContent.indexOf("{");

  if (startIndex === -1) {
    console.log(
      `${COLORS.red}${ICONS.error} No opening brace found${COLORS.reset}`
    );
    return null;
  }

  // Use brace counting to find matching closing brace
  const jsonString = extractWithBraceCounting(cleanContent, startIndex);

  if (!jsonString) {
    console.log(
      `${COLORS.red}${ICONS.error} No matching closing brace found${COLORS.reset}`
    );
    return null;
  }

  console.log(
    `${COLORS.gray}Extracted JSON string:${COLORS.reset}`,
    jsonString
  );

  // Validate and potentially convert
  return validateOrConvert(jsonString, originalContent);
}

/**
 * Extracts JSON using brace counting for nested objects
 */
function extractWithBraceCounting(
  content: string,
  startIndex: number
): string | null {
  let braceCount = 0;
  let endIndex = -1;

  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === "{") braceCount++;
    if (content[i] === "}") braceCount--;

    if (braceCount === 0) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return null;
  }

  return content.substring(startIndex, endIndex + 1);
}

/**
 * Validates JSON has plan structure, or attempts conversion
 */
function validateOrConvert(
  jsonString: string,
  originalContent: string
): string | null {
  try {
    const parsed = JSON.parse(jsonString);
    console.log(`${COLORS.gray}Parsed object:${COLORS.reset}`, parsed);

    if (parsed.goal && parsed.steps) {
      console.log(
        `${COLORS.green}${ICONS.success} Valid plan JSON found${COLORS.reset}`
      );
      return jsonString;
    } else {
      console.log(
        `${COLORS.yellow}${ICONS.warning} JSON missing 'goal' or 'steps' fields${COLORS.reset}`
      );
      console.log(
        `${COLORS.gray}Found fields:${COLORS.reset}`,
        Object.keys(parsed)
      );

      // Try fallback converter for function_call format
      console.log(
        `${COLORS.cyan}→ Trying fallback converter...${COLORS.reset}`
      );
      const converted = convertFunctionCallToPlan(originalContent);
      if (converted) {
        return converted;
      }
    }
  } catch (error) {
    console.log(
      `${COLORS.red}${ICONS.error} JSON parse error:${COLORS.reset}`,
      error
    );
  }

  // Last resort: try fallback converter on original content
  console.log(
    `${COLORS.cyan}→ Last resort: trying fallback converter on original content...${COLORS.reset}`
  );
  const converted = convertFunctionCallToPlan(originalContent);
  if (converted) {
    return converted;
  }

  return null;
}

/**
 * Parses a plan from JSON string with validation
 *
 * Validates both the overall plan structure and individual steps
 */
export const parsePlan = (jsonString: string): Plan | null => {
  try {
    const parsed = JSON.parse(jsonString) as Plan;

    // Validate plan structure
    if (!validatePlanStructure(parsed)) {
      return null;
    }

    // Validate each step
    if (!validateSteps(parsed.steps)) {
      return null;
    }

    return parsed;
  } catch (error) {
    logParseError(jsonString, error);
    return null;
  }
};

/**
 * Validates the overall plan structure
 */
function validatePlanStructure(parsed: Plan): boolean {
  if (!parsed.goal || !parsed.steps || !Array.isArray(parsed.steps)) {
    console.error(
      `\n${COLORS.red}${ICONS.error} Invalid plan structure:${COLORS.reset}`
    );
    console.error(
      `${COLORS.gray}Missing required fields: goal or steps${COLORS.reset}`
    );
    console.error(`${COLORS.gray}Parsed plan:${COLORS.reset}`, parsed);
    return false;
  }
  return true;
}

/**
 * Validates all steps in the plan
 */
function validateSteps(steps: Plan["steps"]): boolean {
  for (const step of steps) {
    if (!step.action || !step.tool || !step.reasoning) {
      console.error(
        `\n${COLORS.red}${ICONS.error} Invalid step structure:${COLORS.reset}`
      );
      console.error(
        `${COLORS.gray}Step missing required fields (action, tool, or reasoning)${COLORS.reset}`
      );
      console.error(`${COLORS.gray}Invalid step:${COLORS.reset}`, step);
      return false;
    }
  }
  return true;
}

/**
 * Logs detailed parse error information
 */
function logParseError(jsonString: string, error: unknown): void {
  console.error(
    `\n${COLORS.red}${ICONS.error} Failed to parse plan JSON:${COLORS.reset}`
  );
  console.error(`${COLORS.gray}JSON String:${COLORS.reset}`, jsonString);
  console.error(
    `${COLORS.gray}Error:${COLORS.reset}`,
    error instanceof Error ? error.message : String(error)
  );
}
