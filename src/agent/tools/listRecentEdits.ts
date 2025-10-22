import { ToolDefinition } from "./../types.js";
import { UndoManager } from "../versionControl/index.js";
import { projectContext } from "../context/ProjectContext.js";

// Initialize undo manager with project context
const undoManager = new UndoManager(projectContext.getProjectRoot());

export const listRecentEditsTool: ToolDefinition = {
  name: "list_recent_edits",
  description: `List all files that have been recently edited and have undo available. Shows which files can be reverted to their previous state. Buffer keeps up to 10 most recent file edits.`,
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },

  func: async (): Promise<string> => {
    try {
      const edits = undoManager.listEdits();

      if (edits.length === 0) {
        return "No recent edits found. No files have undo available.";
      }

      const result: string[] = [];

      result.push(`\n${"=".repeat(60)}`);
      result.push(
        `📝 Recent Edits (${edits.length} file${edits.length !== 1 ? "s" : ""})`
      );
      result.push(`${"=".repeat(60)}\n`);

      edits.forEach((item, index) => {
        const timestamp = new Date(item.edit.timestamp).toLocaleString();
        result.push(`${index + 1}. ${item.filePath}`);
        result.push(`   🕐 Edited: ${timestamp}`);
        result.push(`   💡 Intent: ${item.edit.userIntent}`);
        result.push(
          `   📊 Changes: ${item.edit.before.length} → ${item.edit.after.length} chars`
        );
        result.push("");
      });

      result.push(`${"=".repeat(60)}`);
      result.push(`💡 Use 'undo_edit' to revert any file`);
      result.push(`💡 Use 'show_diff' to see what changed`);
      result.push(`${"=".repeat(60)}`);

      // Show buffer stats
      const stats = undoManager.getStats();
      result.push(`\n📊 Buffer Stats:`);
      result.push(`   Files: ${stats.fileCount}/10`);
      result.push(`   Size: ${(stats.bufferSize / 1024).toFixed(2)} KB`);

      return result.join("\n");
    } catch (error) {
      throw new Error(
        `Failed to list recent edits: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};
