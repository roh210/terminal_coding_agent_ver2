import nodePath from "path";
import { ToolDefinition } from "./../types.js";
import { UndoManager, DiffViewer } from "../versionControl/index.js";

// Initialize undo manager with current working directory
const undoManager = new UndoManager(process.cwd());

export const showDiffTool: ToolDefinition = {
  name: "show_diff",
  description: `Show the differences between the current file and its previous state before the last edit. Displays what was changed in the most recent edit_file operation.`,
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The relative path of the file to show diff for",
      },
    },
    required: ["path"],
  },

  func: async (args): Promise<string> => {
    // Type guard
    if (!("path" in args)) {
      throw new Error("Missing required parameter: path");
    }

    const path: string = args.path as string;
    const resolvedPath = nodePath.resolve(path);

    try {
      // Get the edit record
      const edit = undoManager.getEdit(resolvedPath);

      if (!edit) {
        return `No recent edit found for ${path}. File was not recently edited or undo buffer limit reached.`;
      }

      // Create a simple diff output
      const result: string[] = [];

      result.push(`\n${"=".repeat(60)}`);
      result.push(`📝 Diff for: ${path}`);
      result.push(`🕐 Edited: ${new Date(edit.timestamp).toLocaleString()}`);
      result.push(`💡 Intent: ${edit.userIntent}`);
      result.push(`${"=".repeat(60)}\n`);

      // Show before and after content
      const beforeLines = edit.before.split("\n");
      const afterLines = edit.after.split("\n");

      // Simple line-by-line comparison
      const maxLines = Math.max(beforeLines.length, afterLines.length);
      let hasChanges = false;

      for (let i = 0; i < maxLines; i++) {
        const beforeLine = beforeLines[i] ?? "";
        const afterLine = afterLines[i] ?? "";

        if (beforeLine !== afterLine) {
          hasChanges = true;
          if (beforeLine) {
            result.push(`- ${beforeLine}`);
          }
          if (afterLine) {
            result.push(`+ ${afterLine}`);
          }
        }
      }

      if (!hasChanges) {
        result.push("(No differences found)");
      }

      result.push(`\n${"=".repeat(60)}`);
      result.push(`📊 Stats:`);
      result.push(`   Before: ${beforeLines.length} lines`);
      result.push(`   After: ${afterLines.length} lines`);
      result.push(
        `   Change: ${afterLines.length - beforeLines.length > 0 ? "+" : ""}${
          afterLines.length - beforeLines.length
        } lines`
      );
      result.push(`${"=".repeat(60)}`);

      return result.join("\n");
    } catch (error) {
      throw new Error(
        `Failed to show diff: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};
