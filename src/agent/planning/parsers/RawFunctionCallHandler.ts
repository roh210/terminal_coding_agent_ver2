/**
 * RawFunctionCallHandler
 *
 * Handles raw {call, arguments} format without function_call: prefix.
 * This is a fallback for when LLM returns function call JSON directly.
 *
 * Example input:
 * {"call": "read_file", "arguments": {"path": "test.ts"}}
 *
 * Single Responsibility: Parse raw function call format
 */

import { BaseHandler } from "./BaseHandler.js";
import type { ParserResult } from "./types.js";

export class RawFunctionCallHandler extends BaseHandler {
  protected tryParse(content: string): ParserResult | null {
    const callIndex = content.indexOf('"call"');

    if (callIndex === -1) {
      this.logAttempt("RawFunctionCallHandler", false);
      return null;
    }

    // Find the opening brace before "call"
    const jsonStart = content.lastIndexOf("{", callIndex);

    if (jsonStart === -1) {
      this.logAttempt("RawFunctionCallHandler", false);
      return null;
    }

    const jsonString = this.extractWithBraceCounting(content, jsonStart);

    if (!jsonString) {
      this.logAttempt("RawFunctionCallHandler", false);
      return null;
    }

    const planJson = this.convertRawFunctionCall(jsonString);

    if (planJson) {
      this.logAttempt("RawFunctionCallHandler", true);
      return {
        success: true,
        jsonString: planJson,
        handlerName: "RawFunctionCallHandler",
      };
    }

    this.logAttempt("RawFunctionCallHandler", false);
    return null;
  }

  /**
   * Converts raw function call JSON to plan format
   */
  private convertRawFunctionCall(jsonString: string): string | null {
    try {
      const parsed = JSON.parse(jsonString);

      if (!parsed.call || !parsed.arguments) {
        return null;
      }

      return this.buildPlanJson(parsed.call, parsed.arguments);
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
          reasoning: "Direct tool execution from raw function call",
        },
      ],
    };

    return JSON.stringify(plan);
  }
}
