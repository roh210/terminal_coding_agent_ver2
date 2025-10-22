/**
 * ToolExecutor
 *
 * Responsible for executing tools with consent and error handling.
 *
 * Single Responsibility: Execute tools and handle execution flow
 */

import type { FormatterService } from "../formatting/FormatterService.js";
import type { ToolDefinition } from "../types.js";
import type {
  ToolInput,
  ToolExecutionResult,
  ToolExecutionOptions,
  ToolCallResponse,
  ToolCall,
} from "./types.js";
import { ToolArgumentParser } from "./ToolArgumentParser.js";

export class ToolExecutor {
  constructor(private formatterService: FormatterService) {}

  /**
   * Executes a single tool with consent
   *
   * @param options - Tool, input, and consent function
   * @returns Execution result with optional error
   */
  async executeSingleTool(
    options: ToolExecutionOptions
  ): Promise<ToolExecutionResult> {
    const { tool, input, getToolConsent } = options;

    try {
      // Create tool description for consent
      const toolDescription = `${tool.name}(${JSON.stringify(input)})`;

      // Get user consent before execution
      const approved = await getToolConsent(toolDescription);
      if (!approved) {
        return {
          success: false,
          result: `User denied consent to use tool ${tool.name}`,
          error: "consent_denied",
        };
      }

      // Execute the tool function
      const result = await tool.func(input);

      // Format the result
      const formattedResult = this.formatterService.formatToolResult(
        tool.name,
        input,
        result
      );

      // Log the formatted result
      console.log(formattedResult);

      return {
        success: true,
        result: formattedResult,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const formattedError = this.formatterService.formatError(errorMessage);

      // Log the error
      console.log(formattedError);

      return {
        success: false,
        result: formattedError,
        error: errorMessage,
      };
    }
  }

  /**
   * Executes a tool call by name
   *
   * @param id - Call ID
   * @param name - Tool name
   * @param input - Parsed arguments
   * @param tools - Available tools
   * @param getToolConsent - Consent function
   * @returns OpenAI tool response message
   */
  async executeToolCall(
    id: string,
    name: string,
    input: ToolInput,
    tools: ToolDefinition[],
    getToolConsent: (message: string) => Promise<boolean>
  ): Promise<ToolCallResponse> {
    // Find the tool by name
    const tool = tools.find((t) => t.name === name);

    if (!tool) {
      const errorMessage = `Tool not found: ${name}`;
      return this.createToolResponse(id, errorMessage);
    }

    // Validate required parameters
    const missingParams = this.validateRequiredParameters(tool, input);
    if (missingParams.length > 0) {
      const errorMessage = `❌ Missing required parameters for ${name}: ${missingParams.join(
        ", "
      )}`;
      console.error(errorMessage);
      return this.createToolResponse(id, errorMessage);
    }

    // Execute the tool
    const executionResult = await this.executeSingleTool({
      tool,
      input,
      getToolConsent,
    });

    return this.createToolResponse(id, executionResult.result);
  }

  /**
   * Validates that all required parameters are present in input
   *
   * @param tool - Tool definition
   * @param input - Parsed input arguments
   * @returns Array of missing parameter names
   */
  private validateRequiredParameters(
    tool: ToolDefinition,
    input: ToolInput
  ): string[] {
    const required = tool.input_schema.required || [];
    const missing: string[] = [];

    for (const param of required) {
      if (
        !(param in input) ||
        input[param] === undefined ||
        input[param] === ""
      ) {
        missing.push(param);
      }
    }

    return missing;
  }

  /**
   * Executes multiple tool calls in sequence
   *
   * @param toolCalls - Array of tool calls from LLM
   * @param tools - Available tools
   * @param getToolConsent - Consent function
   * @returns Array of tool response messages
   */
  async executeToolCalls(
    toolCalls: ToolCall[],
    tools: ToolDefinition[],
    getToolConsent: (message: string) => Promise<boolean>
  ): Promise<ToolCallResponse[]> {
    const results: ToolCallResponse[] = [];

    for (const call of toolCalls) {
      // Skip non-function tool calls
      if (call.type !== "function") continue;

      // Parse arguments
      const input = ToolArgumentParser.parseArguments(
        call.function.arguments,
        call.function.name
      );

      // Execute the tool call
      const result = await this.executeToolCall(
        call.id,
        call.function.name,
        input,
        tools,
        getToolConsent
      );

      results.push(result);
    }

    return results;
  }

  /**
   * Creates an OpenAI tool response message
   *
   * @param id - Tool call ID
   * @param content - Response content
   * @returns Tool response message
   */
  private createToolResponse(id: string, content: string): ToolCallResponse {
    return {
      role: "tool",
      tool_call_id: id,
      content,
    };
  }
}
