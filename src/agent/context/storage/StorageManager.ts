/**
 * Storage Manager (Facade Pattern)
 *
 * Coordinates all repositories and implements IStorage interface.
 * Single Responsibility: Orchestrate repository operations
 */

import type {
  IStorage,
  Conversation,
  Message,
  FileContext,
  FileEdit,
  Session,
} from "../types.js";
import { DatabaseConnection } from "./database.js";
import {
  ConversationRepository,
  MessageRepository,
  FileContextRepository,
  SessionRepository,
} from "./repositories/index.js";

export class StorageManager implements IStorage {
  private dbConnection: DatabaseConnection;
  private conversationRepo: ConversationRepository;
  private messageRepo: MessageRepository;
  private fileContextRepo: FileContextRepository;
  private sessionRepo: SessionRepository;

  constructor(dbPath?: string) {
    this.dbConnection = new DatabaseConnection(dbPath);
    const db = this.dbConnection.getConnection();

    this.conversationRepo = new ConversationRepository(db);
    this.messageRepo = new MessageRepository(db);
    this.fileContextRepo = new FileContextRepository(db);
    this.sessionRepo = new SessionRepository(db);
  }

  // ===== Conversation Operations =====

  async createConversation(conversation: Conversation): Promise<void> {
    this.conversationRepo.create(conversation);
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const conversation = this.conversationRepo.findById(id);
    if (!conversation) return null;

    // Load messages
    conversation.messages = this.messageRepo.findByConversationId(id);
    return conversation;
  }

  async updateConversation(conversation: Conversation): Promise<void> {
    this.conversationRepo.updateTimestamp(
      conversation.id,
      conversation.lastUpdatedAt
    );
  }

  async listConversations(limit?: number): Promise<Conversation[]> {
    const ids = this.conversationRepo.getAllIds();
    const limitedIds = limit ? ids.slice(0, limit) : ids;

    const conversations = await Promise.all(
      limitedIds.map((id) => this.getConversation(id))
    );

    return conversations.filter((c): c is Conversation => c !== null);
  }

  // ===== Message Operations =====

  async addMessage(message: Message): Promise<void> {
    this.messageRepo.save(message);

    // Update conversation timestamp
    this.conversationRepo.updateTimestamp(message.conversationId, new Date());
  }

  async getMessages(
    conversationId: string,
    limit?: number
  ): Promise<Message[]> {
    const messages = this.messageRepo.findByConversationId(conversationId);
    return limit ? messages.slice(-limit) : messages;
  }

  async searchMessages(query: string): Promise<Message[]> {
    return this.messageRepo.search(query);
  }

  // ===== File Context Operations =====

  async trackFileAccess(path: string): Promise<void> {
    this.fileContextRepo.track(path);
  }

  async getFileContext(path: string): Promise<FileContext | null> {
    return this.fileContextRepo.getContext(path);
  }

  async recordFileEdit(edit: FileEdit): Promise<void> {
    this.fileContextRepo.saveEdit(edit);
  }

  async getFileEdits(path: string, limit?: number): Promise<FileEdit[]> {
    const edits = this.fileContextRepo.getEdits(path);
    return limit ? edits.slice(0, limit) : edits;
  }

  // ===== Session Operations =====

  async createSession(session: Session): Promise<void> {
    this.sessionRepo.create(session);
  }

  async getSession(id: string): Promise<Session | null> {
    return this.sessionRepo.findById(id);
  }

  async updateSession(session: Session): Promise<void> {
    this.sessionRepo.update(session);
  }

  async listSessions(): Promise<Session[]> {
    return this.sessionRepo.getAll();
  }

  // ===== Cleanup =====

  close(): void {
    this.dbConnection.close();
  }
}
