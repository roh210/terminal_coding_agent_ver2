/**
 * Conversation Repository
 *
 * Handles all database operations for conversations.
 * Single Responsibility: Conversation data access
 */

import type Database from "better-sqlite3";
import type { Conversation } from "../../types.js";
import { ConversationMapper } from "../mappers/index.js";

export class ConversationRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new conversation
   */
  create(conversation: Conversation): void {
    const row = ConversationMapper.toRow(conversation);

    this.db
      .prepare(
        `INSERT INTO conversations (id, started_at, last_updated_at)
         VALUES (?, ?, ?)`
      )
      .run(row.id, row.started_at, row.last_updated_at);
  }

  /**
   * Find conversation by ID
   */
  findById(id: string): Conversation | null {
    const row = this.db
      .prepare(
        `SELECT id, started_at, last_updated_at
         FROM conversations
         WHERE id = ?`
      )
      .get(id);

    if (!row) return null;

    const conversation = ConversationMapper.toDomain(row as any);
    conversation.messages = []; // Messages loaded separately by MessageRepository

    return conversation;
  }

  /**
   * Update conversation's last updated timestamp
   */
  updateTimestamp(id: string, timestamp: Date): void {
    this.db
      .prepare(
        `UPDATE conversations
         SET last_updated_at = ?
         WHERE id = ?`
      )
      .run(timestamp.toISOString(), id);
  }

  /**
   * Delete conversation and all its messages
   */
  delete(id: string): void {
    // Delete messages first (foreign key constraint)
    this.db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);

    // Delete conversation
    this.db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  }

  /**
   * Get all conversation IDs
   */
  getAllIds(): string[] {
    const rows = this.db
      .prepare("SELECT id FROM conversations ORDER BY last_updated_at DESC")
      .all() as Array<{ id: string }>;

    return rows.map((row) => row.id);
  }
}
