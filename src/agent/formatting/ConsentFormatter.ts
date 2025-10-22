/**
 * ConsentFormatter - Strategy Pattern for tool consent prompts
 *
 * Phase 6: Extracted from formatter.ts
 *
 * Single Responsibility: Format tool consent request prompts
 * Principle: Strategy Pattern - Different formatting for different tools
 *
 * Benefits:
 * - Clean, readable consent messages for each tool type
 * - Handles long content intelligently (truncates with metadata)
 * - Easy to add new tools
 * - Separates consent formatting from execution
 */

import { Formatter, ConsentFormatData, FormatOptions } from "./types.js";
import { COLORS } from "../constants.js";

export class ConsentFormatter implements Formatter<ConsentFormatData> {
  /**
   * Main entry point - Strategy Pattern
   * Routes to appropriate formatter based on tool name
   */
  format(data: ConsentFormatData, options?: FormatOptions): string {
    const style = options?.style || "colored";

    if (!data || !data.toolName) {
      return this.formatGeneric(data, style);
    }

    try {
      // Route to specific formatter based on tool name
      switch (data.toolName) {
        case "read_file":
          return this.formatReadFile(data, style);
        case "list_files":
          return this.formatListFiles(data, style);
        case "create_directory":
          return this.formatCreateDirectory(data, style);
        case "edit_file":
          return this.formatEditFile(data, style);
        default:
          return this.formatGeneric(data, style);
      }
    } catch (error) {
      // If formatting fails, return simple format
      return this.formatGeneric(data, style);
    }
  }

  /**
   * Format read_file consent request
   * Shows file path to be read
   */
  private formatReadFile(
    data: ConsentFormatData,
    style: "colored" | "plain" | "json"
  ): string {
    if (style === "json") {
      return JSON.stringify(data, null, 2);
    }

    const { toolName, args } = data;
    const path = args.path || args.filePath || "unknown";

    if (style === "colored") {
      return `${COLORS.cyan}${toolName}${COLORS.reset}(${COLORS.yellow}"${path}"${COLORS.reset})`;
    } else {
      return `${toolName}("${path}")`;
    }
  }

  /**
   * Format list_files consent request
   * Shows directory path to be listed
   */
  private formatListFiles(
    data: ConsentFormatData,
    style: "colored" | "plain" | "json"
  ): string {
    if (style === "json") {
      return JSON.stringify(data, null, 2);
    }

    const { toolName, args } = data;
    const path = args.path || ".";

    if (style === "colored") {
      return `${COLORS.cyan}${toolName}${COLORS.reset}(${COLORS.yellow}"${path}"${COLORS.reset})`;
    } else {
      return `${toolName}("${path}")`;
    }
  }

  /**
   * Format create_directory consent request
   * Shows directory path to be created
   */
  private formatCreateDirectory(
    data: ConsentFormatData,
    style: "colored" | "plain" | "json"
  ): string {
    if (style === "json") {
      return JSON.stringify(data, null, 2);
    }

    const { toolName, args } = data;
    const path = args.path || "unknown";

    if (style === "colored") {
      return `${COLORS.cyan}${toolName}${COLORS.reset}(${COLORS.yellow}"${path}"${COLORS.reset})`;
    } else {
      return `${toolName}("${path}")`;
    }
  }

  /**
   * Format edit_file consent request
   * Intelligently handles long content with line/char counts
   */
  private formatEditFile(
    data: ConsentFormatData,
    style: "colored" | "plain" | "json"
  ): string {
    if (style === "json") {
      return JSON.stringify(data, null, 2);
    }

    const { toolName, args } = data;
    const path = args.path || args.filePath || "unknown";
    const oldStr = (args.old_str as string) || "";
    const newStr = (args.new_str as string) || "";

    // Determine if creating new file or editing existing
    const isCreating = oldStr === "" || oldStr === undefined;
    const operation = isCreating ? "Create" : "Edit";

    // Handle long content intelligently
    if (newStr && newStr.length > 100) {
      const lineCount = (newStr.match(/\n/g) || []).length + 1;

      if (style === "colored") {
        return `${COLORS.cyan}${toolName}${COLORS.reset}(${COLORS.yellow}"${path}"${COLORS.reset}) - ${operation} file with ${COLORS.green}${lineCount} lines${COLORS.reset} (${COLORS.gray}${newStr.length} chars${COLORS.reset})`;
      } else {
        return `${toolName}("${path}") - ${operation} file with ${lineCount} lines (${newStr.length} chars)`;
      }
    } else if (isCreating) {
      if (style === "colored") {
        return `${COLORS.cyan}${toolName}${COLORS.reset}(${COLORS.yellow}"${path}"${COLORS.reset}) - Create new file`;
      } else {
        return `${toolName}("${path}") - Create new file`;
      }
    } else {
      if (style === "colored") {
        return `${COLORS.cyan}${toolName}${COLORS.reset}(${COLORS.yellow}"${path}"${COLORS.reset}) - Replace text`;
      } else {
        return `${toolName}("${path}") - Replace text`;
      }
    }
  }

  /**
   * Generic formatter for unknown tool types
   * Shows tool name and args (truncates if long)
   */
  private formatGeneric(
    data: ConsentFormatData,
    style: "colored" | "plain" | "json"
  ): string {
    if (style === "json") {
      return JSON.stringify(data, null, 2);
    }

    const { toolName, args } = data;
    const argsJson = JSON.stringify(args || {});

    // If args are short, show them in full
    if (argsJson.length < 200) {
      return `${toolName}(${argsJson})`;
    }

    // If args are long, show char count
    return `${toolName}(<${argsJson.length} chars>)`;
  }
}
