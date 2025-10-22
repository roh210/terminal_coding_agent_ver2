/**
 * Session Mapper
 * 
 * Converts between database rows and domain objects for sessions.
 * Single Responsibility: Data transformation for sessions
 */

import type { Session, SessionRow } from '../../types.js';

export class SessionMapper {
  /**
   * Convert database row to domain object
   */
  static toDomain(row: SessionRow): Session {
    return {
      id: row.id,
      name: row.name,
      project: row.project || undefined,
      currentConversationId: row.current_conversation_id,
      activeFiles: [], // Loaded separately from session_files table
      createdAt: new Date(row.created_at),
      lastActive: new Date(row.last_active),
    };
  }

  /**
   * Convert domain object to database row (for inserts/updates)
   */
  static toRow(session: Session): SessionRow {
    return {
      id: session.id,
      name: session.name,
      project: session.project || null,
      current_conversation_id: session.currentConversationId,
      created_at: session.createdAt.toISOString(),
      last_active: session.lastActive.toISOString(),
    };
  }
}
