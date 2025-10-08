import OpenAI from "openai";
import { ToolDefinition } from "./types.js";
import { DEFAULT_MODEL, DEFAULT_MAX_TOKENS } from "./constants.js";

/**
 * Handles communication with OpenAI API
 */

/**
 * Converts tool definitions to OpenAI API format
 */
export const buildToolsForAPI = (
  tools: ToolDefinition[]
): OpenAI.Chat.ChatCompletionTool[] => {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
};

/**
 * Runs inference with OpenAI API
 */
export const runInference = async (
  client: OpenAI,
  conversation: OpenAI.Chat.ChatCompletionMessageParam[],
  tools: ToolDefinition[],
  model: string = DEFAULT_MODEL,
  maxTokens: number = DEFAULT_MAX_TOKENS
): Promise<OpenAI.Chat.ChatCompletion> => {
  const openAITools = buildToolsForAPI(tools);

  return client.chat.completions.create({
    model,
    messages: conversation,
    tools: openAITools,
    max_tokens: maxTokens,
  });
};

/**
 * Extracts the assistant's message from the API response
 */
export const extractAssistantMessage = (
  response: OpenAI.Chat.ChatCompletion
): OpenAI.Chat.ChatCompletionMessage => {
  return response.choices[0].message;
};

/**
 * Checks if the response contains tool calls
 */
export const hasToolCalls = (
  message: OpenAI.Chat.ChatCompletionMessage
): boolean => {
  return !!(message.tool_calls && message.tool_calls.length > 0);
};
