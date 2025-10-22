/**
 * Session Repository
 * 
 * Handles all database operations for sessions.
 * Single Responsibility: Session data access
 */

import type Database from 'better-sqlite3';
import type { Session } from '../../types.js';
import { SessionMapper } from '../mappers/index.js';

export class SessionRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new session
   */
  create(session: Session): void {
    const row = SessionMapper.toRow(session);

    this.db
      .prepare(
        `INSERT INTO sessions (id, name, project, current_conversation_id, created_at, last_active)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.id,
        row.name,
        row.project,
        row.current_conversation_id,
        row.created_at,
        row.last_active
      );

    // Save active files
    if (session.activeFiles.length > 0) {
      const insertFile = this.db.prepare(
        'INSERT INTO session_files (session_id, file_path) VALUES (?, ?)'
      );
      for (const filePath of session.activeFiles) {
        insertFile.run(session.id, filePath);
      }
    }
  }

  /**
   * Find session by ID
   */
  findById(id: string): Session | null {
    const row = this.db
      .prepare(
        `SELECT id, name, project, current_conversation_id, created_at, last_active
         FROM sessions
         WHERE id = ?`
      )
      .get(id);

    if (!row) return null;

    const session = SessionMapper.toDomain(row as any);

    // Load active files
    const fileRows = this.db
      .prepare('SELECT file_path FROM session_files WHERE session_id = ?')
      .all(id) as Array<{ file_path: string }>;
    session.activeFiles = fileRows.map(f => f.file_path);

    return session;
  }

  /**
   * Update session
   */
  update(session: Session): void {
    const row = SessionMapper.toRow(session);

    this.db
      .prepare(
        `UPDATE sessions
         SET name = ?, project = ?, current_conversation_id = ?, last_active = ?
         WHERE id = ?`
      )
      .run(
        row.name,
        row.project,
        row.current_conversation_id,
        row.last_active,
        row.id
      );

    // Update active files - delete old, insert new
    this.db.prepare('DELETE FROM session_files WHERE session_id = ?').run(session.id);

    if (session.activeFiles.length > 0) {
      const insertFile = this.db.prepare(
        'INSERT INTO session_files (session_id, file_path) VALUES (?, ?)'
      );
      for (const filePath of session.activeFiles) {
        insertFile.run(session.id, filePath);
      }
    }
  }

  /**
   * Get all sessions
   */
  getAll(): Session[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, project, current_conversation_id, created_at, last_active
         FROM sessions
         ORDER BY last_active DESC`
      )
      .all();

    return rows.map((row: any) => {
      const session = SessionMapper.toDomain(row);

      // Load active files
      const fileRows = this.db
        .prepare('SELECT file_path FROM session_files WHERE session_id = ?')
        .all(session.id) as Array<{ file_path: string }>;
      session.activeFiles = fileRows.map(f => f.file_path);

      return session;
    });
  }

  /**
   * Delete session
   */
  delete(id: string): void {
    // Delete session files first
    this.db.prepare('DELETE FROM session_files WHERE session_id = ?').run(id);
    
    // Delete session
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }
}
