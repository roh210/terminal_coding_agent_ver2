/**
 * Execution Module Types
 *
 * Shared types and interfaces for tool argument parsing and execution.
 * These types define contracts between the Parser and Executor.
 */

import type OpenAI from "openai";
import type { ToolDefinition } from "../types.js";

/**
 * Tool input arguments (parsed from JSON)
 */
export interface ToolInput {
  [key: string]: unknown;
}

/**
 * Result of a single tool execution
 */
export interface ToolExecutionResult {
  success: boolean;
  result: string;
  error?: string;
}

/**
 * Options for executing a single tool
 */
export interface ToolExecutionOptions {
  tool: ToolDefinition;
  input: ToolInput;
  getToolConsent: (message: string) => Promise<boolean>;
}

/**
 * Tool call response message (OpenAI format)
 */
export interface ToolCallResponse {
  role: "tool";
  tool_call_id: string;
  content: string;
}

/**
 * Tool call from LLM (OpenAI format)
 * Directly use OpenAI's type without modification
 */
export type ToolCall = OpenAI.Chat.ChatCompletionMessageToolCall;
