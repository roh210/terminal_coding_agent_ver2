import nodePath from "path";
import { ToolDefinition } from "./../types.js";
import { UndoManager, DiffViewer } from "../versionControl/index.js";
import { projectContext } from "../context/ProjectContext.js";

// Initialize undo manager with project context
const undoManager = new UndoManager(projectContext.getProjectRoot());

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

    // Use projectContext to resolve path relative to where agent was invoked
    const resolvedPath = projectContext.resolvePath(path);

    try {
      // Get the edit record
      const edit = undoManager.getEdit(resolvedPath);

      if (!edit) {
        return `No recent edit found for ${path}. File was not recently edited or undo buffer limit reached.`;
      }

      // Create header
      const result: string[] = [];
      result.push(`\n${"=".repeat(60)}`);
      result.push(`📝 Diff for: ${path}`);
      result.push(`🕐 Edited: ${new Date(edit.timestamp).toLocaleString()}`);
      result.push(`💡 Intent: ${edit.userIntent}`);
      result.push(`${"=".repeat(60)}\n`);

      // Use enhanced DiffViewer for colored diff output
      const diff = DiffViewer.formatLineDiff(edit.before, edit.after, path);
      result.push(diff);

      result.push(`\n${"=".repeat(60)}`);

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
