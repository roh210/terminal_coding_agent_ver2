/**
 * Message Repository
 *
 * Handles all database operations for messages.
 * Single Responsibility: Message data access (including FTS search)
 */

import type Database from "better-sqlite3";
import type { Message } from "../../types.js";
import { MessageMapper } from "../mappers/index.js";

export class MessageRepository {
  constructor(private db: Database.Database) {}

  /**
   * Save a message to a conversation
   */
  save(message: Message): void {
    const row = MessageMapper.toRow(message, message.conversationId);

    this.db
      .prepare(
        `INSERT INTO messages (
          id, conversation_id, timestamp, role, content, token_count
        ) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.id,
        row.conversation_id,
        row.timestamp,
        row.role,
        row.content,
        row.token_count || null
      );

    // Save file references if any
    if (message.fileReferences && message.fileReferences.length > 0) {
      const insertRef = this.db.prepare(
        "INSERT INTO message_files (message_id, file_path) VALUES (?, ?)"
      );

      for (const filePath of message.fileReferences) {
        insertRef.run(row.id, filePath);
      }
    }

    // Save tool calls if any
    if (message.toolCalls && message.toolCalls.length > 0) {
      const insertTool = this.db.prepare(
        `INSERT INTO tool_calls (message_id, tool, args, result)
         VALUES (?, ?, ?, ?)`
      );

      for (const toolCall of message.toolCalls) {
        insertTool.run(
          row.id,
          toolCall.tool,
          JSON.stringify(toolCall.args),
          toolCall.result || null
        );
      }
    }
  }

  /**
   * Find all messages for a conversation
   */
  findByConversationId(conversationId: string): Message[] {
    const rows = this.db
      .prepare(
        `SELECT id, conversation_id, timestamp, role, content, token_count
         FROM messages
         WHERE conversation_id = ?
         ORDER BY timestamp ASC`
      )
      .all(conversationId);

    return rows.map((row: any) => {
      const message = MessageMapper.toDomain(row);

      // Load file references
      const fileRefs = this.db
        .prepare("SELECT file_path FROM message_files WHERE message_id = ?")
        .all(message.id) as Array<{ file_path: string }>;
      message.fileReferences = fileRefs.map((ref) => ref.file_path);

      // Load tool calls
      const toolCalls = this.db
        .prepare(
          "SELECT tool, args, result FROM tool_calls WHERE message_id = ?"
        )
        .all(message.id) as Array<{
        tool: string;
        args: string;
        result: string | null;
      }>;
      message.toolCalls = toolCalls.map((tc) => ({
        tool: tc.tool,
        args: JSON.parse(tc.args),
        result: tc.result || undefined,
      }));

      return message;
    });
  }

  /**
   * Search messages using full-text search
   */
  search(query: string, limit: number = 10): Message[] {
    const rows = this.db
      .prepare(
        `SELECT m.id, m.conversation_id, m.timestamp, m.role, m.content, m.token_count
         FROM messages_fts fts
         JOIN messages m ON fts.rowid = m.rowid
         WHERE messages_fts MATCH ?
         ORDER BY rank
         LIMIT ?`
      )
      .all(query, limit);

    return rows.map((row: any) => {
      const message = MessageMapper.toDomain(row);

      // Load file references
      const fileRefs = this.db
        .prepare("SELECT file_path FROM message_files WHERE message_id = ?")
        .all(message.id) as Array<{ file_path: string }>;
      message.fileReferences = fileRefs.map((ref) => ref.file_path);

      // Load tool calls
      const toolCalls = this.db
        .prepare(
          "SELECT tool, args, result FROM tool_calls WHERE message_id = ?"
        )
        .all(message.id) as Array<{
        tool: string;
        args: string;
        result: string | null;
      }>;
      message.toolCalls = toolCalls.map((tc) => ({
        tool: tc.tool,
        args: JSON.parse(tc.args),
        result: tc.result || undefined,
      }));

      return message;
    });
  }

  /**
   * Delete all messages for a conversation
   */
  deleteByConversationId(conversationId: string): void {
    this.db
      .prepare("DELETE FROM messages WHERE conversation_id = ?")
      .run(conversationId);
  }
}
