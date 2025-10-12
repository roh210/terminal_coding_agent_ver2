import * as fs from "fs";
import * as path from "path";

/**
 * Edit record stored in the undo buffer
 */
export interface EditRecord {
  before: string;
  after: string;
  timestamp: string;
  userIntent: string;
}

/**
 * Undo buffer structure - maps file paths to their last edit
 */
export interface UndoBuffer {
  [filePath: string]: EditRecord;
}

/**
 * UndoManager - Lightweight in-memory buffer for edit history
 * Stores only the last edit for each file in a single JSON file
 */
export class UndoManager {
  private bufferPath: string;
  private maxFiles: number;

  constructor(workingDir: string, maxFiles: number = 10) {
    // Store in .git directory if it exists, otherwise in working directory
    const gitDir = path.join(workingDir, ".git");
    const storageDir = fs.existsSync(gitDir) ? gitDir : workingDir;

    this.bufferPath = path.join(storageDir, "agent-undo.json");
    this.maxFiles = maxFiles;
  }

  /**
   * Read the undo buffer from disk
   */
  private readBuffer(): UndoBuffer {
    try {
      if (fs.existsSync(this.bufferPath)) {
        const data = fs.readFileSync(this.bufferPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Failed to read undo buffer:", error);
    }
    return {};
  }

  /**
   * Write the undo buffer to disk
   */
  private writeBuffer(buffer: UndoBuffer): void {
    try {
      const data = JSON.stringify(buffer, null, 2);
      fs.writeFileSync(this.bufferPath, data, "utf-8");
    } catch (error) {
      console.error("Failed to write undo buffer:", error);
    }
  }

  /**
   * Record an edit in the undo buffer
   */
  recordEdit(
    filePath: string,
    before: string,
    after: string,
    userIntent: string
  ): void {
    const buffer = this.readBuffer();

    // Add or update the edit record
    buffer[filePath] = {
      before,
      after,
      timestamp: new Date().toISOString(),
      userIntent,
    };

    // Cleanup: Keep only most recent N files
    const entries = Object.entries(buffer);
    if (entries.length > this.maxFiles) {
      // Sort by timestamp (newest first)
      entries.sort(
        (a, b) =>
          new Date(b[1].timestamp).getTime() -
          new Date(a[1].timestamp).getTime()
      );

      // Keep only the newest maxFiles entries
      const cleaned = Object.fromEntries(entries.slice(0, this.maxFiles));
      this.writeBuffer(cleaned);
    } else {
      this.writeBuffer(buffer);
    }
  }

  /**
   * Get edit record for a file
   */
  getEdit(filePath: string): EditRecord | null {
    const buffer = this.readBuffer();
    return buffer[filePath] || null;
  }

  /**
   * Undo the last edit to a file
   * Returns the restored content, or null if no edit to undo
   */
  undoEdit(filePath: string): string | null {
    const buffer = this.readBuffer();
    const edit = buffer[filePath];

    if (!edit) {
      return null;
    }

    // Remove the edit from buffer
    delete buffer[filePath];
    this.writeBuffer(buffer);

    // Return the "before" content to restore
    return edit.before;
  }

  /**
   * Get all files with undo available
   */
  listEdits(): Array<{ filePath: string; edit: EditRecord }> {
    const buffer = this.readBuffer();

    return Object.entries(buffer)
      .map(([filePath, edit]) => ({ filePath, edit }))
      .sort(
        (a, b) =>
          new Date(b.edit.timestamp).getTime() -
          new Date(a.edit.timestamp).getTime()
      );
  }

  /**
   * Check if a file has an undo available
   */
  canUndo(filePath: string): boolean {
    const buffer = this.readBuffer();
    return filePath in buffer;
  }

  /**
   * Clear all undo history
   */
  clearAll(): void {
    this.writeBuffer({});
  }

  /**
   * Get buffer statistics
   */
  getStats(): { fileCount: number; bufferSize: number } {
    const buffer = this.readBuffer();
    const fileCount = Object.keys(buffer).length;

    let bufferSize = 0;
    for (const edit of Object.values(buffer)) {
      bufferSize += edit.before.length + edit.after.length;
    }

    return { fileCount, bufferSize };
  }
}
