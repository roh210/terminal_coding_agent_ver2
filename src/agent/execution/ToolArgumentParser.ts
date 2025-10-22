/**
 * ToolArgumentParser
 *
 * Responsible for parsing and validating tool arguments from LLM responses.
 *
 * Single Responsibility: Parse JSON arguments and clean/validate inputs
 */

import type { ToolInput } from "./types.js";

export class ToolArgumentParser {
  /**
   * Parses JSON arguments from a tool call
   *
   * @param argsString - Raw JSON string from LLM
   * @param toolName - Name of the tool being called (for error logging)
   * @returns Parsed ToolInput object, or empty object on error
   */
  static parseArguments(argsString: string, toolName: string): ToolInput {
    try {
      // Handle empty or whitespace-only strings
      if (!argsString || argsString.trim() === "") {
        console.warn(
          `⚠️  Empty arguments for ${toolName}, using empty object {}`
        );
        return {};
      }

      const parsed = JSON.parse(argsString);
      return this.cleanFilePaths(parsed);
    } catch (error) {
      console.error(`❌ Error parsing arguments for ${toolName}:`, error);
      console.error(`   Raw arguments: "${argsString}"`);
      // Return empty object to prevent tool from failing completely
      return {};
    }
  }

  /**
   * Cleans @ symbols from file paths
   *
   * LLM sometimes adds @ symbols to file paths. This method recursively
   * removes them from string values in the input object.
   *
   * @param input - Parsed tool input
   * @returns Cleaned input with @ symbols removed from paths
   */
  private static cleanFilePaths(input: ToolInput): ToolInput {
    const cleaned: ToolInput = {};

    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string") {
        // Remove @ symbols from string values (likely file paths)
        cleaned[key] = value.replace(/@/g, "");
      } else if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Recursively clean nested objects
        cleaned[key] = this.cleanFilePaths(value as ToolInput);
      } else {
        // Keep other types as-is (numbers, booleans, arrays, null)
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Validates that all required arguments are present
   *
   * @param input - Parsed tool input
   * @param requiredParams - Array of required parameter names
   * @returns True if all required params are present, false otherwise
   */
  static validateArguments(
    input: ToolInput,
    requiredParams: string[]
  ): boolean {
    return requiredParams.every((param) => {
      const value = input[param];
      // Check that param exists and is not null/undefined
      return value !== null && value !== undefined;
    });
  }
}
