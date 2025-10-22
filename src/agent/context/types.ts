/**
 * Type definitions for context management system
 */

/**
 * Message in a conversation
 */
export interface Message {
  id: string;
  conversationId: string;
  timestamp: Date;
  role: "user" | "assistant" | "system";
  content: string;
  fileReferences?: string[]; // Files mentioned with @filename
  toolCalls?: ToolCall[];
  tokenCount?: number; // Cached token count
}

/**
 * Tool call made by the assistant
 */
export interface ToolCall {
  tool: string;
  args: Record<string, any>;
  result?: string;
}

/**
 * Conversation containing multiple messages
 */
export interface Conversation {
  id: string;
  startedAt: Date;
  lastUpdatedAt: Date;
  messages: Message[];
  summary?: string; // AI-generated summary
  totalTokens: number; // Sum of all message tokens
}

/**
 * File context tracking
 */
export interface FileContext {
  path: string;
  lastAccessed: Date;
  accessCount: number;
  relatedFiles: string[]; // Files frequently used together
  recentEdits: FileEdit[];
  purpose?: string; // AI-inferred purpose of the file
}

/**
 * File edit record
 */
export interface FileEdit {
  id: string;
  filePath: string;
  conversationId: string;
  messageId: string;
  timestamp: Date;
  oldContent?: string;
  newContent?: string;
  diff?: string;
  reason?: string; // Why this edit was made
}

/**
 * Session for managing multiple projects/conversations
 */
export interface Session {
  id: string;
  name: string;
  project?: string; // Project/workspace path
  currentConversationId: string;
  activeFiles: string[]; // Files currently being worked on
  createdAt: Date;
  lastActive: Date;
}

/**
 * Context building options
 */
export interface ContextOptions {
  tokenBudget?: number; // Max tokens for context (default: 3000)
  includeRecentCount?: number; // Number of recent messages to always include (default: 5)
  includeFileContext?: boolean; // Include file relationship info (default: true)
  currentQuery?: string; // Current user query for relevance matching
}

/**
 * Database row types (snake_case from SQLite)
 */
export interface ConversationRow {
  id: string;
  started_at: string; // ISO timestamp
  last_updated_at: string;
  summary: string | null;
  total_tokens: number;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  timestamp: string;
  role: string;
  content: string;
  token_count: number | null;
}

export interface FileContextRow {
  path: string;
  last_accessed: string;
  access_count: number;
  purpose: string | null;
}

export interface FileEditRow {
  id: string;
  file_path: string;
  conversation_id: string;
  message_id: string;
  timestamp: string;
  old_content: string | null;
  new_content: string | null;
  diff: string | null;
  reason: string | null;
}

export interface SessionRow {
  id: string;
  name: string;
  project: string | null;
  current_conversation_id: string;
  created_at: string;
  last_active: string;
}

/**
 * Storage interface for abstraction
 */
export interface IStorage {
  // Conversation operations
  createConversation(conversation: Conversation): Promise<void>;
  getConversation(id: string): Promise<Conversation | null>;
  updateConversation(conversation: Conversation): Promise<void>;
  listConversations(limit?: number): Promise<Conversation[]>;

  // Message operations
  addMessage(message: Message): Promise<void>;
  getMessages(conversationId: string, limit?: number): Promise<Message[]>;
  searchMessages(query: string): Promise<Message[]>;

  // File context operations
  trackFileAccess(path: string): Promise<void>;
  getFileContext(path: string): Promise<FileContext | null>;
  recordFileEdit(edit: FileEdit): Promise<void>;
  getFileEdits(path: string, limit?: number): Promise<FileEdit[]>;

  // Session operations
  createSession(session: Session): Promise<void>;
  getSession(id: string): Promise<Session | null>;
  updateSession(session: Session): Promise<void>;
  listSessions(): Promise<Session[]>;

  // Cleanup
  close(): void;
}
