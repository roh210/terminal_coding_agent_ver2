/**
 * Database Connection and Schema Management
 * 
 * Single Responsibility: Manage database connection and schema initialization
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseConnection {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const finalPath = dbPath || this.getDefaultPath();

    // Create directory if it doesn't exist
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(finalPath);

    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');

    // Initialize schema
    this.initializeSchema();
  }

  /**
   * Get raw database connection (for repositories)
   */
  getConnection(): Database.Database {
    return this.db;
  }

  /**
   * Get default database path
   */
  private getDefaultPath(): string {
    return path.join(__dirname, '../../../../.agent-context/context.db');
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    this.createTables();
    this.createIndexes();
    this.createFullTextSearch();
  }

  /**
   * Create all database tables
   */
  private createTables(): void {
    // Conversations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        last_updated_at TEXT NOT NULL,
        summary TEXT,
        total_tokens INTEGER DEFAULT 0
      )
    `);

    // Messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        token_count INTEGER,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // Message file references (many-to-many)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS message_files (
        message_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        PRIMARY KEY (message_id, file_path)
      )
    `);

    // Tool calls
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tool_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        tool TEXT NOT NULL,
        args TEXT NOT NULL,
        result TEXT,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      )
    `);

    // File contexts
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_contexts (
        path TEXT PRIMARY KEY,
        last_accessed TEXT NOT NULL,
        access_count INTEGER DEFAULT 1,
        purpose TEXT
      )
    `);

    // File edits
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_edits (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        old_content TEXT,
        new_content TEXT,
        diff TEXT,
        reason TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      )
    `);

    // Related files (many-to-many with relation count)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_relations (
        file1 TEXT NOT NULL,
        file2 TEXT NOT NULL,
        relation_count INTEGER DEFAULT 1,
        PRIMARY KEY (file1, file2)
      )
    `);

    // Sessions
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        project TEXT,
        current_conversation_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_active TEXT NOT NULL,
        FOREIGN KEY (current_conversation_id) REFERENCES conversations(id)
      )
    `);

    // Session active files
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_files (
        session_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        PRIMARY KEY (session_id, file_path)
      )
    `);
  }

  /**
   * Create database indexes for performance
   */
  private createIndexes(): void {
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation 
      ON messages(conversation_id);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
      ON messages(timestamp DESC);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_file_edits_path 
      ON file_edits(file_path);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_file_edits_conversation 
      ON file_edits(conversation_id);
    `);
  }

  /**
   * Create full-text search index
   */
  private createFullTextSearch(): void {
    // Check if FTS table exists
    const tableExists = this.db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='messages_fts'`
      )
      .get();

    if (!tableExists) {
      this.db.exec(`
        CREATE VIRTUAL TABLE messages_fts USING fts5(
          message_id UNINDEXED,
          content,
          content=messages,
          content_rowid=rowid
        )
      `);

      // Create triggers to keep FTS in sync
      this.db.exec(`
        CREATE TRIGGER messages_fts_insert AFTER INSERT ON messages BEGIN
          INSERT INTO messages_fts(rowid, message_id, content)
          VALUES (new.rowid, new.id, new.content);
        END;
      `);

      this.db.exec(`
        CREATE TRIGGER messages_fts_delete AFTER DELETE ON messages BEGIN
          DELETE FROM messages_fts WHERE rowid = old.rowid;
        END;
      `);

      this.db.exec(`
        CREATE TRIGGER messages_fts_update AFTER UPDATE ON messages BEGIN
          UPDATE messages_fts SET content = new.content WHERE rowid = new.rowid;
        END;
      `);
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
