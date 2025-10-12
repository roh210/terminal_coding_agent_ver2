import fs from "fs/promises";
import nodePath from "path";
import { ToolDefinition } from "./../types.js";
import { UndoManager } from "../versionControl/index.js";

// Initialize undo manager with current working directory
const undoManager = new UndoManager(process.cwd());

export const undoEditTool: ToolDefinition = {
  name: "undo_edit",
  description: `Undo the last edit made to a file. Restores the file to its state before the most recent edit_file operation. Works for recently edited files (up to last 10 files edited).`,
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The relative path of the file to undo changes for",
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
      // Check if undo is available
      if (!undoManager.canUndo(resolvedPath)) {
        return `No undo available for ${path}. File was not recently edited, or undo was already used.`;
      }

      // Get the edit record to show what we're undoing
      const edit = undoManager.getEdit(resolvedPath);
      if (!edit) {
        return `No undo available for ${path}.`;
      }

      // Perform the undo (this removes it from the buffer and returns "before" content)
      const beforeContent = undoManager.undoEdit(resolvedPath);

      if (beforeContent === null) {
        return `Failed to undo changes for ${path}.`;
      }

      // Restore the file to its previous state
      await fs.writeFile(resolvedPath, beforeContent, "utf-8");

      return `✅ Successfully reverted ${path} to previous state.\n\nEdit was made at: ${edit.timestamp}\nIntent: ${edit.userIntent}`;
    } catch (error) {
      throw new Error(
        `Failed to undo edit: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};
