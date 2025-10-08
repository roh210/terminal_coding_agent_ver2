import OpenAI from "openai";
import { ToolDefinition } from "./types.js";
import { formatToolResult, formatError } from "./formatter.js";

/**
 * Safely parses tool arguments from JSON string
 * Returns parsed object or empty object on error
 */
export const parseToolArguments = (
  argsString: string,
  toolName: string
): Record<string, unknown> => {
  try {
    return JSON.parse(argsString || "{}");
  } catch (error) {
    console.error(
      `Failed to parse tool arguments for ${toolName}:`,
      argsString
    );
    console.error("Parse error:", error);
    return {};
  }
};

/**
 * Creates a tool response message for the conversation
 */
export const createToolResponse = (
  id: string,
  content: string
): OpenAI.Chat.ChatCompletionMessageParam => {
  return {
    role: "tool" as const,
    tool_call_id: id,
    content,
  };
};

/**
 * Executes a single tool with consent and error handling
 */
export const executeSingleTool = async (
  tool: ToolDefinition,
  input: unknown,
  getToolConsent: (message: string) => Promise<boolean>
): Promise<{ result: string; error?: string }> => {
  const toolDescription = `${tool.name}(${JSON.stringify(input)})`;
  const hasConsent = await getToolConsent(toolDescription);

  if (!hasConsent) {
    return {
      result: `User denied consent to use tool ${tool.name}`,
      error: "consent_denied",
    };
  }

  try {
    const result = await tool.func(input);
    const formattedResult = formatToolResult(tool.name, input, result);
    console.log(formattedResult);
    return { result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(formatError(tool.name, errorMessage));
    return { result: errorMessage, error: "execution_error" };
  }
};

/**
 * Executes a single tool call from the AI
 */
export const executeToolCall = async (
  id: string,
  name: string,
  input: unknown,
  tools: ToolDefinition[],
  getToolConsent: (message: string) => Promise<boolean>
): Promise<OpenAI.Chat.ChatCompletionMessageParam> => {
  const tool = tools.find((t) => t.name === name);

  if (!tool) {
    return createToolResponse(id, `Tool ${name} not found`);
  }

  const { result } = await executeSingleTool(tool, input, getToolConsent);
  return createToolResponse(id, result);
};

/**
 * Executes all tool calls from the AI response in sequence
 */
export const executeToolCalls = async (
  toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[],
  tools: ToolDefinition[],
  getToolConsent: (message: string) => Promise<boolean>
): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> => {
  const results: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  for (const toolCall of toolCalls) {
    if (toolCall.type !== "function") continue;

    const parsedArgs = parseToolArguments(
      toolCall.function.arguments,
      toolCall.function.name
    );

    const toolResult = await executeToolCall(
      toolCall.id,
      toolCall.function.name,
      parsedArgs,
      tools,
      getToolConsent
    );

    results.push(toolResult);
  }

  return results;
};
