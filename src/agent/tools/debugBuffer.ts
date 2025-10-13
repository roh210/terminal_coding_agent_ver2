import { ToolDefinition } from "./../types.js";
import { UndoManager } from "../versionControl/index.js";
import * as fs from "fs";
import * as path from "path";

// Initialize undo manager with current working directory
const undoManager = new UndoManager(process.cwd());

export const debugBufferTool: ToolDefinition = {
  name: "debug_buffer",
  description: `Debug tool to check undo buffer status and location. Shows where the buffer file is stored and its contents.`,
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },

  func: async (): Promise<string> => {
    try {
      const workingDir = process.cwd();
      const gitDir = path.join(workingDir, ".git");
      const storageDir = fs.existsSync(gitDir) ? gitDir : workingDir;
      const bufferPath = path.join(storageDir, "agent-undo.json");

      const result: string[] = [];

      result.push(`\n${"=".repeat(60)}`);
      result.push(`🔍 Undo Buffer Debug Info`);
      result.push(`${"=".repeat(60)}\n`);

      result.push(`📁 Working Directory: ${workingDir}`);
      result.push(
        `📁 Git Directory: ${gitDir} ${
          fs.existsSync(gitDir) ? "✅ exists" : "❌ not found"
        }`
      );
      result.push(`📄 Buffer Path: ${bufferPath}`);
      result.push(
        `📄 Buffer Exists: ${fs.existsSync(bufferPath) ? "✅ yes" : "❌ no"}\n`
      );

      if (fs.existsSync(bufferPath)) {
        const bufferContent = fs.readFileSync(bufferPath, "utf-8");
        result.push(`📝 Buffer Content:`);
        result.push(`${"─".repeat(60)}`);
        result.push(bufferContent);
        result.push(`${"─".repeat(60)}\n`);
      }

      // Get stats from UndoManager
      const stats = undoManager.getStats();
      result.push(`📊 UndoManager Stats:`);
      result.push(`   Files in buffer: ${stats.fileCount}`);
      result.push(
        `   Total size: ${(stats.bufferSize / 1024).toFixed(2)} KB\n`
      );

      // List edits
      const edits = undoManager.listEdits();
      result.push(`📝 Edits from listEdits():`);
      if (edits.length === 0) {
        result.push(`   (No edits found)`);
      } else {
        edits.forEach((item, index) => {
          result.push(`   ${index + 1}. ${item.filePath}`);
          result.push(`      Timestamp: ${item.edit.timestamp}`);
          result.push(`      Before length: ${item.edit.before.length} chars`);
          result.push(`      After length: ${item.edit.after.length} chars`);
        });
      }

      // Test: Try to write a test record
      result.push(`\n${"=".repeat(60)}`);
      result.push(`🧪 Testing Buffer Write...`);
      result.push(`${"─".repeat(60)}`);

      try {
        const testPath = path.join(workingDir, "TEST_FILE.txt");
        undoManager.recordEdit(
          testPath,
          "before content",
          "after content",
          "Debug test write"
        );
        result.push(`✅ Successfully wrote test record to buffer`);

        // Read it back
        const testEdit = undoManager.getEdit(testPath);
        if (testEdit) {
          result.push(`✅ Successfully read test record back`);
          result.push(`   Before: "${testEdit.before}"`);
          result.push(`   After: "${testEdit.after}"`);
          result.push(`   Intent: "${testEdit.userIntent}"`);
        } else {
          result.push(`❌ Failed to read test record back`);
        }

        // Clean up test record
        undoManager.undoEdit(testPath);
        result.push(`✅ Cleaned up test record`);
      } catch (error) {
        result.push(
          `❌ Test write failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      result.push(`\n${"=".repeat(60)}`);

      return result.join("\n");
    } catch (error) {
      throw new Error(
        `Failed to debug buffer: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};
