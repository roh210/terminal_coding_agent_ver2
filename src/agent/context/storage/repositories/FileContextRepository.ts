/**
 * FileContext Repository
 *
 * Handles all database operations for file contexts.
 * Single Responsibility: File context data access
 */

import type Database from "better-sqlite3";
import type { FileContext, FileEdit } from "../../types.js";
import { FileContextMapper } from "../mappers/index.js";

export class FileContextRepository {
  constructor(private db: Database.Database) {}

  /**
   * Track file access
   */
  track(path: string, purpose?: string): void {
    const existing = this.db
      .prepare("SELECT * FROM file_contexts WHERE path = ?")
      .get(path);

    if (existing) {
      // Update existing
      this.db
        .prepare(
          `UPDATE file_contexts
           SET last_accessed = ?, access_count = access_count + 1, purpose = ?
           WHERE path = ?`
        )
        .run(new Date().toISOString(), purpose || null, path);
    } else {
      // Insert new
      this.db
        .prepare(
          `INSERT INTO file_contexts (path, last_accessed, access_count, purpose)
           VALUES (?, ?, ?, ?)`
        )
        .run(path, new Date().toISOString(), 1, purpose || null);
    }
  }

  /**
   * Get file context
   */
  getContext(path: string): FileContext | null {
    const row = this.db
      .prepare(
        `SELECT path, last_accessed, access_count, purpose
         FROM file_contexts
         WHERE path = ?`
      )
      .get(path);

    if (!row) return null;

    const fileContext = FileContextMapper.toDomain(row as any);

    // Load related files
    const relatedRows = this.db
      .prepare("SELECT file2 FROM file_relations WHERE file1 = ?")
      .all(path) as Array<{ file2: string }>;
    fileContext.relatedFiles = relatedRows.map((r) => r.file2);

    // Load recent edits
    const editRows = this.db
      .prepare(
        `SELECT id, file_path, conversation_id, message_id, timestamp, old_content, new_content, diff, reason
         FROM file_edits
         WHERE file_path = ?
         ORDER BY timestamp DESC
         LIMIT 10`
      )
      .all(path) as Array<{
      id: string;
      file_path: string;
      conversation_id: string;
      message_id: string;
      timestamp: string;
      old_content: string | null;
      new_content: string | null;
      diff: string | null;
      reason: string | null;
    }>;

    fileContext.recentEdits = editRows.map((edit) => ({
      id: edit.id,
      filePath: edit.file_path,
      conversationId: edit.conversation_id,
      messageId: edit.message_id,
      timestamp: new Date(edit.timestamp),
      oldContent: edit.old_content || undefined,
      newContent: edit.new_content || undefined,
      diff: edit.diff || undefined,
      reason: edit.reason || undefined,
    }));

    return fileContext;
  }

  /**
   * Save file edit
   */
  saveEdit(edit: FileEdit): void {
    this.db
      .prepare(
        `INSERT INTO file_edits (id, file_path, conversation_id, message_id, timestamp, old_content, new_content, diff, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        edit.id,
        edit.filePath,
        edit.conversationId,
        edit.messageId,
        edit.timestamp.toISOString(),
        edit.oldContent || null,
        edit.newContent || null,
        edit.diff || null,
        edit.reason || null
      );
  }

  /**
   * Get all file edits for a path
   */
  getEdits(path: string): FileEdit[] {
    const rows = this.db
      .prepare(
        `SELECT id, file_path, conversation_id, message_id, timestamp, old_content, new_content, diff, reason
         FROM file_edits
         WHERE file_path = ?
         ORDER BY timestamp DESC`
      )
      .all(path) as Array<{
      id: string;
      file_path: string;
      conversation_id: string;
      message_id: string;
      timestamp: string;
      old_content: string | null;
      new_content: string | null;
      diff: string | null;
      reason: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      filePath: row.file_path,
      conversationId: row.conversation_id,
      messageId: row.message_id,
      timestamp: new Date(row.timestamp),
      oldContent: row.old_content || undefined,
      newContent: row.new_content || undefined,
      diff: row.diff || undefined,
      reason: row.reason || undefined,
    }));
  }

  /**
   * Add file relation
   */
  addRelation(filePath: string, relatedPath: string): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO file_relations (file1, file2)
         VALUES (?, ?)`
      )
      .run(filePath, relatedPath);
  }
}
