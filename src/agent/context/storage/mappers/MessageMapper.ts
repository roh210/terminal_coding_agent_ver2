/**
 * Message Mapper
 * 
 * Converts between database rows and domain objects for messages.
 * Single Responsibility: Data transformation for messages
 */

import type { Message, MessageRow } from '../../types.js';

export class MessageMapper {
  /**
   * Convert database row to domain object
   */
  static toDomain(row: MessageRow): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      timestamp: new Date(row.timestamp),
      role: row.role as 'user' | 'assistant' | 'system',
      content: row.content,
      tokenCount: row.token_count || undefined,
      fileReferences: [], // Loaded separately if needed
      toolCalls: [], // Loaded separately if needed
    };
  }

  /**
   * Convert domain object to database row (for inserts/updates)
   */
  static toRow(message: Message, conversationId: string): MessageRow {
    return {
      id: message.id,
      conversation_id: conversationId,
      timestamp: message.timestamp.toISOString(),
      role: message.role,
      content: message.content,
      token_count: message.tokenCount || null,
    };
  }
}
