/**
 * ToolFormatter - Strategy Pattern for tool result formatting
 *
 * Phase 6: Extracted from formatter.ts
 *
 * Single Responsibility: Format tool execution results
 * Principle: Strategy Pattern - Different formatting strategies for different tools
 *
 * Benefits:
 * - Easy to add new tool result formats
 * - Each tool formatter is testable independently
 * - Clean separation between tool types
 * - No need to modify existing code when adding new tools
 */

import { Formatter, ToolFormatData, FormatOptions } from "./types.js";
import { COLORS, ICONS } from "../constants.js";

export class ToolFormatter implements Formatter<ToolFormatData> {
  /**
   * Main entry point - Strategy Pattern
   * Routes to appropriate formatter based on tool name
   */
  format(data: ToolFormatData, options?: FormatOptions): string {
    const style = options?.style || "colored";

    if (!data || !data.tool) {
      return this.formatGeneric(data, style);
    }

    // Route to specific formatter based on tool name
    switch (data.tool) {
      case "read_file":
        return this.formatReadFile(data, style);
      case "list_files":
        return this.formatListFiles(data, style);
      case "edit_file":
        return this.formatEditFile(data, style);
      case "create_directory":
        return this.formatCreateDirectory(data, style);
      default:
        return this.formatGeneric(data, style);
    }
  }

  /**
   * Format read_file tool results
   * Shows file path and content preview
   */
  private formatReadFile(
    data: ToolFormatData,
    style: "colored" | "plain" | "json"
  ): string {
    if (style === "json") {
      return JSON.stringify(data, null, 2);
    }

    const { tool, params, result } = data;
    const filePath = params?.path || params?.filePath || "unknown";
    // Result is a string (file contents), not an object
    const content = typeof result === "string" ? result : result?.content || "";
    const lineCount = content.split("\n").length;

    if (style === "colored") {
      return [
        `${COLORS.cyan}📄 File Read: ${COLORS.reset}${filePath}`,
        `${COLORS.dim}Lines: ${lineCount}${COLORS.reset}`,
        "",
        content,
        "",
      ].join("\n");
    } else {
      // Plain text
      return [
        `📄 File Read: ${filePath}`,
        `Lines: ${lineCount}`,
        "",
        content,
        "",
      ].join("\n");
    }
  }

  /**
   * Format list_files tool results
   * Shows directory contents with file counts
   */
  private formatListFiles(
    data: ToolFormatData,
    style: "colored" | "plain" | "json"
  ): string {
    if (style === "json") {
      return JSON.stringify(data, null, 2);
    }

    const { params, result } = data;
    const dirPath = params?.path || ".";
    // Result is a JSON string, parse it to get the array
    let files: string[] = [];
    if (typeof result === "string") {
      try {
        files = JSON.parse(result);
      } catch (e) {
        files = [];
      }
    } else if (Array.isArray(result)) {
      files = result;
    } else if (result?.files) {
      files = result.files;
    }

    const dirs = files.filter((f: string) => f.endsWith("/")).length;
    const regularFiles = files.length - dirs;

    if (style === "colored") {
      const fileList = files
        .map((f: string) => {
          if (f.endsWith("/")) {
            return `  ${COLORS.blue}📁 ${f}${COLORS.reset}`;
          } else {
            return `  ${COLORS.cyan}📄 ${f}${COLORS.reset}`;
          }
        })
        .join("\n");

      return [
        `${COLORS.cyan}📁 Directory: ${COLORS.reset}${dirPath}`,
        `${COLORS.dim}${dirs} directories, ${regularFiles} files${COLORS.reset}`,
        "",
        fileList,
        "",
      ].join("\n");
    } else {
      // Plain text
      const fileList = files
        .map((f: string) => {
          if (f.endsWith("/")) {
            return `  📁 ${f}`;
          } else {
            return `  📄 ${f}`;
          }
        })
        .join("\n");

      return [
        `📁 Directory: ${dirPath}`,
        `${dirs} directories, ${regularFiles} files`,
        "",
        fileList,
        "",
      ].join("\n");
    }
  }

  /**
   * Format edit_file tool results
   * Shows confirmation of edit with file path
   */
  private formatEditFile(
    data: ToolFormatData,
    style: "colored" | "plain" | "json"
  ): string {
    if (style === "json") {
      return JSON.stringify(data, null, 2);
    }

    const { params, result } = data;
    const filePath = params?.filePath || "unknown";
    const success = result?.success !== false;

    if (style === "colored") {
      if (success) {
        return [
          `${COLORS.green}${ICONS.success} File Edited: ${COLORS.reset}${filePath}`,
          `${COLORS.dim}Changes applied successfully${COLORS.reset}`,
          "",
        ].join("\n");
      } else {
        const error = (result as any)?.error || "Unknown error";
        return [
          `${COLORS.red}${ICONS.error} Edit Failed: ${COLORS.reset}${filePath}`,
          `${COLORS.dim}${error}${COLORS.reset}`,
          "",
        ].join("\n");
      }
    } else {
      // Plain text
      if (success) {
        return [
          `✅ File Edited: ${filePath}`,
          `Changes applied successfully`,
          "",
        ].join("\n");
      } else {
        const error = (result as any)?.error || "Unknown error";
        return [`❌ Edit Failed: ${filePath}`, `${error}`, ""].join("\n");
      }
    }
  }

  /**
   * Format create_directory tool results
   * Shows whether a file or directory was created
   */
  private formatCreateDirectory(
    data: ToolFormatData,
    style: "colored" | "plain" | "json"
  ): string {
    if (style === "json") {
      return JSON.stringify(data, null, 2);
    }

    const { params, result } = data;
    const path = params?.path || "unknown";
    const resultStr =
      typeof result === "string" ? result : JSON.stringify(result);

    // Determine if it's a file or directory based on result message
    const isFile = resultStr.includes("File created");
    const content = params?.content || "";
    const lines = content ? content.split("\n").length : 0;

    if (style === "colored") {
      if (isFile) {
        return [
          `${COLORS.green}${ICONS.success} File Created: ${COLORS.reset}${path}`,
          `${COLORS.dim}${lines} line${lines !== 1 ? "s" : ""} written${
            COLORS.reset
          }`,
          "",
        ].join("\n");
      } else {
        return [
          `${COLORS.green}${ICONS.success} Directory Created: ${COLORS.reset}${path}`,
          "",
        ].join("\n");
      }
    } else {
      // Plain text
      if (isFile) {
        return [
          `✅ File Created: ${path}`,
          `${lines} line${lines !== 1 ? "s" : ""} written`,
          "",
        ].join("\n");
      } else {
        return [`✅ Directory Created: ${path}`, ""].join("\n");
      }
    }
  }

  /**
   * Generic formatter for unknown tool types
   * Fallback that displays raw result
   */
  private formatGeneric(
    data: ToolFormatData,
    style: "colored" | "plain" | "json"
  ): string {
    if (style === "json") {
      return JSON.stringify(data, null, 2);
    }

    const { tool, result } = data;
    const toolName = tool || "unknown";
    const resultStr =
      typeof result === "string" ? result : JSON.stringify(result, null, 2);

    if (style === "colored") {
      return [
        `${COLORS.cyan}${ICONS.tool} Tool: ${COLORS.reset}${toolName}`,
        `${COLORS.dim}Result:${COLORS.reset}`,
        "",
        resultStr,
        "",
      ].join("\n");
    } else {
      // Plain text
      return [`🔧 Tool: ${toolName}`, `Result:`, "", resultStr, ""].join("\n");
    }
  }
}
