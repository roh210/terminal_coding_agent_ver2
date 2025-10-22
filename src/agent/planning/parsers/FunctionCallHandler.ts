/**
 * FunctionCallHandler
 *
 * Handles function_call: format from LLM.
 * Converts function call format to plan format.
 *
 * Example input:
 * function_call: {"call": "read_file", "arguments": {"path": "test.ts"}}
 *
 * Single Responsibility: Parse and convert function_call format
 */

import { BaseHandler } from "./BaseHandler.js";
import type { ParserResult } from "./types.js";

export class FunctionCallHandler extends BaseHandler {
  protected tryParse(content: string): ParserResult | null {
    const functionCallPrefix = content.indexOf("function_call:");

    if (functionCallPrefix === -1) {
      this.logAttempt("FunctionCallHandler", false);
      return null;
    }

    const jsonStart = content.indexOf("{", functionCallPrefix);
    if (jsonStart === -1) {
      this.logAttempt("FunctionCallHandler", false);
      return null;
    }

    const jsonString = this.extractWithBraceCounting(content, jsonStart);
    if (!jsonString) {
      this.logAttempt("FunctionCallHandler", false);
      return null;
    }

    // Convert function_call format to plan format
    const planJson = this.convertFunctionCallToPlan(jsonString);

    if (planJson) {
      this.logAttempt("FunctionCallHandler", true);
      return {
        success: true,
        jsonString: planJson,
        handlerName: "FunctionCallHandler",
      };
    }

    this.logAttempt("FunctionCallHandler", false);
    return null;
  }

  /**
   * Converts function_call JSON to plan format
   */
  private convertFunctionCallToPlan(jsonString: string): string | null {
    try {
      const functionCall = JSON.parse(jsonString);

      if (!functionCall.call && !functionCall.id) {
        return null;
      }

      const toolName = functionCall.call || functionCall.id;
      const args = functionCall.arguments || {};

      return this.buildPlanJson(toolName, args);
    } catch {
      return null;
    }
  }

  /**
   * Builds plan JSON from tool name and arguments
   */
  private buildPlanJson(
    toolName: string,
    args: Record<string, unknown>
  ): string {
    // Create human-readable goal based on the tool
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
}
