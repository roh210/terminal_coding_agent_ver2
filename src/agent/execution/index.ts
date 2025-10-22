/**
 * Execution Module
 *
 * Provides sandboxed code execution capabilities using Daytona API.
 * Ensures safe execution of user code in isolated cloud environments.
 * Also provides tool argument parsing and execution.
 */

import { formatterService } from "../formatting/index.js";
import { ToolArgumentParser } from "./ToolArgumentParser.js";
import { ToolExecutor } from "./ToolExecutor.js";
import type { ToolCall } from "./types.js";
import type { ToolDefinition } from "../types.js";

// Daytona API-based sandbox
export {
  DaytonaManager,
  type DaytonaExecutionResult,
  type DaytonaExecutionOptions,
  type DaytonaWorkspace,
} from "./daytonaManager.js";

// Tool execution
export { ToolArgumentParser } from "./ToolArgumentParser.js";
export { ToolExecutor } from "./ToolExecutor.js";
export type {
  ToolInput,
  ToolExecutionResult,
  ToolExecutionOptions,
  ToolCallResponse,
  ToolCall,
} from "./types.js";

// Convenience function exports for backward compatibility
export const parseToolArguments = ToolArgumentParser.parseArguments;

// Singleton executor instance (backward compatibility)
const toolExecutor = new ToolExecutor(formatterService);

/**
 * Executes multiple tool calls (backward compatible function)
 */
export const executeToolCalls = (
  toolCalls: ToolCall[],
  tools: ToolDefinition[],
  getToolConsent: (message: string) => Promise<boolean>
) => toolExecutor.executeToolCalls(toolCalls, tools, getToolConsent);
