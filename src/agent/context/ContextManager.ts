/**
 * Context Manager - Main interface for persistent context management
 */

import { randomUUID } from "crypto";
import { encode } from "gpt-tokenizer";
import { StorageManager } from "./storage/index.js";
import {
  Conversation,
  Message,
  FileContext,
  FileEdit,
  Session,
  ContextOptions,
  IStorage,
} from "./types.js";

/**
 * Main context management class
 * Handles conversation history, file tracking, and session management
 */
export class ContextManager {
  private storage: IStorage;
  private currentSession?: Session;

  constructor(dbPath?: string) {
    this.storage = new StorageManager(dbPath);
  }

  // ==================== Conversation Management ====================

  /**
   * Create a new conversation
   */
  async createConversation(summary?: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: randomUUID(),
      startedAt: new Date(),
      lastUpdatedAt: new Date(),
      messages: [],
      summary,
      totalTokens: 0,
    };

    await this.storage.createConversation(conversation);
    return conversation;
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    role: "user" | "assistant" | "system",
    content: string,
    options?: {
      fileReferences?: string[];
      toolCalls?: Message["toolCalls"];
    }
  ): Promise<Message> {
    const message: Message = {
      id: randomUUID(),
      conversationId,
      timestamp: new Date(),
      role,
      content,
      fileReferences: options?.fileReferences,
      toolCalls: options?.toolCalls,
      tokenCount: this.estimateTokens(content),
    };

    await this.storage.addMessage(message);

    // Track file accesses
    if (message.fileReferences) {
      for (const file of message.fileReferences) {
        await this.storage.trackFileAccess(file);
      }
    }

    return message;
  }

  /**
   * Get a conversation with all its messages
   */
  async getConversation(id: string): Promise<Conversation | null> {
    return this.storage.getConversation(id);
  }

  /**
   * Get recent messages from a conversation
   */
  async getRecentMessages(
    conversationId: string,
    limit: number = 10
  ): Promise<Message[]> {
    return this.storage.getMessages(conversationId, limit);
  }

  /**
   * Search messages across all conversations
   */
  async searchMessages(query: string): Promise<Message[]> {
    return this.storage.searchMessages(query);
  }

  /**
   * List recent conversations
   */
  async listConversations(limit: number = 10): Promise<Conversation[]> {
    return this.storage.listConversations(limit);
  }

  // ==================== Context Building ====================

  /**
   * Build context string for AI prompt
   * Selects relevant messages within token budget
   */
  async buildContext(
    conversationId: string,
    options?: ContextOptions
  ): Promise<string> {
    const {
      tokenBudget = 3000,
      includeRecentCount = 5,
      includeFileContext = true,
      currentQuery = "",
    } = options || {};

    const conversation = await this.getConversation(conversationId);
    if (!conversation || conversation.messages.length === 0) {
      return "";
    }

    const allMessages = conversation.messages;

    // Phase 1: Always include recent messages (high priority)
    const recentMessages = allMessages.slice(-includeRecentCount);
    let selectedMessages = [...recentMessages];
    let usedTokens = this.calculateTotalTokens(selectedMessages);

    // Phase 2: Include messages with file references matching current query
    if (currentQuery) {
      const queryFiles = this.extractFileReferences(currentQuery);
      if (queryFiles.length > 0) {
        const fileMessages = allMessages.filter(
          (m) =>
            m.fileReferences?.some((f) => queryFiles.includes(f)) &&
            !selectedMessages.find((sm) => sm.id === m.id)
        );

        for (const msg of fileMessages) {
          const msgTokens = msg.tokenCount || this.estimateTokens(msg.content);
          if (usedTokens + msgTokens <= tokenBudget) {
            selectedMessages.push(msg);
            usedTokens += msgTokens;
          }
        }
      }
    }

    // Phase 3: Include messages with tool calls (edits, executions)
    const toolMessages = allMessages.filter(
      (m) => m.toolCalls && !selectedMessages.find((sm) => sm.id === m.id)
    );

    for (const msg of toolMessages) {
      const msgTokens = msg.tokenCount || this.estimateTokens(msg.content);
      if (usedTokens + msgTokens <= tokenBudget) {
        selectedMessages.push(msg);
        usedTokens += msgTokens;
      } else {
        break; // Budget exhausted
      }
    }

    // Phase 4: Fill remaining budget with relevant messages
    if (currentQuery && usedTokens < tokenBudget) {
      const keywords = this.extractKeywords(currentQuery);
      const relevantMessages = allMessages.filter((m) => {
        if (selectedMessages.find((sm) => sm.id === m.id)) return false;
        return keywords.some((k) => m.content.toLowerCase().includes(k));
      });

      for (const msg of relevantMessages) {
        const msgTokens = msg.tokenCount || this.estimateTokens(msg.content);
        if (usedTokens + msgTokens <= tokenBudget) {
          selectedMessages.push(msg);
          usedTokens += msgTokens;
        } else {
          break;
        }
      }
    }

    // Sort by timestamp (chronological order)
    selectedMessages.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Format context string
    return this.formatContext(selectedMessages, {
      includeFileContext,
      conversationSummary: conversation.summary,
    });
  }

  /**
   * Format messages into context string
   */
  private formatContext(
    messages: Message[],
    options: { includeFileContext: boolean; conversationSummary?: string }
  ): string {
    const parts: string[] = [];

    // Add conversation summary if available
    if (options.conversationSummary) {
      parts.push(`# Context Summary\n${options.conversationSummary}\n`);
    }

    // Add conversation history
    parts.push("# Conversation History\n");
    for (const msg of messages) {
      const role = msg.role === "user" ? "User" : "Assistant";
      parts.push(`${role}: ${msg.content}`);

      if (msg.fileReferences && msg.fileReferences.length > 0) {
        parts.push(`  [Files: ${msg.fileReferences.join(", ")}]`);
      }

      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const tools = msg.toolCalls.map((t) => t.tool).join(", ");
        parts.push(`  [Tools used: ${tools}]`);
      }
    }

    return parts.join("\n");
  }

  /**
   * Extract file references from text (@filename)
   */
  private extractFileReferences(text: string): string[] {
    const matches = text.match(/@([a-zA-Z0-9_\-./]+)/g);
    if (!matches) return [];
    return matches.map((m) => m.substring(1)); // Remove @ prefix
  }

  /**
   * Extract keywords from query for relevance matching
   */
  private extractKeywords(query: string): string[] {
    // Remove common words and split
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "and",
      "or",
      "but",
      "is",
      "are",
      "was",
      "were",
      "this",
      "that",
    ]);

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));
  }

  /**
   * Estimate token count for text
   */
  private estimateTokens(text: string): number {
    try {
      return encode(text).length;
    } catch (error) {
      // Fallback: rough estimate (1 token ≈ 4 characters)
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Calculate total tokens for array of messages
   */
  private calculateTotalTokens(messages: Message[]): number {
    return messages.reduce(
      (sum, msg) => sum + (msg.tokenCount || this.estimateTokens(msg.content)),
      0
    );
  }

  // ==================== File Context Management ====================

  /**
   * Track file access
   */
  async trackFileAccess(filePath: string): Promise<void> {
    await this.storage.trackFileAccess(filePath);
  }

  /**
   * Get file context (access history, related files, edits)
   */
  async getFileContext(filePath: string): Promise<FileContext | null> {
    return this.storage.getFileContext(filePath);
  }

  /**
   * Record a file edit
   */
  async recordFileEdit(
    filePath: string,
    conversationId: string,
    messageId: string,
    options?: {
      oldContent?: string;
      newContent?: string;
      diff?: string;
      reason?: string;
    }
  ): Promise<FileEdit> {
    const edit: FileEdit = {
      id: randomUUID(),
      filePath,
      conversationId,
      messageId,
      timestamp: new Date(),
      ...options,
    };

    await this.storage.recordFileEdit(edit);
    return edit;
  }

  /**
   * Get recent edits for a file
   */
  async getFileEdits(
    filePath: string,
    limit: number = 10
  ): Promise<FileEdit[]> {
    return this.storage.getFileEdits(filePath, limit);
  }

  // ==================== Session Management ====================

  /**
   * Create a new session
   */
  async createSession(
    name: string,
    project?: string,
    conversationId?: string
  ): Promise<Session> {
    // Create conversation if not provided
    const convId = conversationId || (await this.createConversation()).id;

    const session: Session = {
      id: randomUUID(),
      name,
      project,
      currentConversationId: convId,
      activeFiles: [],
      createdAt: new Date(),
      lastActive: new Date(),
    };

    await this.storage.createSession(session);
    this.currentSession = session;
    return session;
  }

  /**
   * Load an existing session
   */
  async loadSession(id: string): Promise<Session | null> {
    const session = await this.storage.getSession(id);
    if (session) {
      this.currentSession = session;
    }
    return session;
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | undefined {
    return this.currentSession;
  }

  /**
   * Update current session
   */
  async updateSession(updates: Partial<Session>): Promise<void> {
    if (!this.currentSession) {
      throw new Error("No active session");
    }

    this.currentSession = {
      ...this.currentSession,
      ...updates,
      lastActive: new Date(),
    };

    await this.storage.updateSession(this.currentSession);
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<Session[]> {
    return this.storage.listSessions();
  }

  /**
   * Get all conversations for a session
   */
  async getSessionConversations(sessionId: string): Promise<Conversation[]> {
    const session = await this.storage.getSession(sessionId);
    if (!session) return [];

    // For now, just return the current conversation
    // In a full implementation, we'd store session-conversation relationships
    const conversation = await this.storage.getConversation(
      session.currentConversationId
    );
    return conversation ? [conversation] : [];
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    conversationId: string,
    limit?: number
  ): Promise<Message[]> {
    return this.storage.getMessages(conversationId, limit);
  }

  /**
   * Add file to current session's active files
   */
  async addActiveFile(filePath: string): Promise<void> {
    if (!this.currentSession) {
      throw new Error("No active session");
    }

    if (!this.currentSession.activeFiles.includes(filePath)) {
      this.currentSession.activeFiles.push(filePath);
      await this.updateSession({
        activeFiles: this.currentSession.activeFiles,
      });
    }
  }

  /**
   * Remove file from current session's active files
   */
  async removeActiveFile(filePath: string): Promise<void> {
    if (!this.currentSession) {
      throw new Error("No active session");
    }

    this.currentSession.activeFiles = this.currentSession.activeFiles.filter(
      (f) => f !== filePath
    );
    await this.updateSession({ activeFiles: this.currentSession.activeFiles });
  }

  // ==================== Cleanup ====================

  /**
   * Close database connection
   */
  close(): void {
    this.storage.close();
  }
}
