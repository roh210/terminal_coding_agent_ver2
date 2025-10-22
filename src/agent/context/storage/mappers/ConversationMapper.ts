/**
 * Conversation Mapper
 * 
 * Converts between database rows and domain objects for conversations.
 * Single Responsibility: Data transformation for conversations
 */

import type { Conversation, ConversationRow } from '../../types.js';

export class ConversationMapper {
  /**
   * Convert database row to domain object
   */
  static toDomain(row: ConversationRow): Conversation {
    return {
      id: row.id,
      startedAt: new Date(row.started_at),
      lastUpdatedAt: new Date(row.last_updated_at),
      messages: [], // Messages loaded separately by MessageRepository
      summary: row.summary || undefined,
      totalTokens: row.total_tokens,
    };
  }

  /**
   * Convert domain object to database row (for inserts/updates)
   */
  static toRow(conversation: Conversation): ConversationRow {
    return {
      id: conversation.id,
      started_at: conversation.startedAt.toISOString(),
      last_updated_at: conversation.lastUpdatedAt.toISOString(),
      summary: conversation.summary || null,
      total_tokens: conversation.totalTokens,
    };
  }
}
