/**
 * Session Service
 *
 * Applies the following principles:
 * 1. Single Responsibility - ONLY handles session management
 * 2. Abstraction - Hides session complexity behind simple interface
 * 3. Encapsulation - Session state is private, accessed through methods
 * 4. Dependency Injection - ContextManager injected, not created
 *
 * Why this is better than inline session management:
 * - Agent doesn't need to know HOW sessions work
 * - All session logic in ONE place (easy to find and modify)
 * - Can test session logic independently
 * - Can swap storage implementations without touching Agent
 * - Clear, simple API for session operations
 */

import { ContextManager } from "../context/index.js";
import { generateSessionName } from "../utils/stringUtils.js";

/**
 * Represents a session with its conversation
 */
export interface Session {
  id: string;
  name: string;
  project: string;
  currentConversationId: string;
  createdAt: Date;
  lastActive: Date;
}

/**
 * Represents a stored message
 */
export interface StoredMessage {
  role: string;
  content: string;
  timestamp: Date;
}

/**
 * Service for managing user sessions
 *
 * Responsibilities:
 * - Initialize sessions for projects
 * - Auto-name sessions from user messages
 * - Switch between sessions
 * - Load session conversation history
 *
 * Example usage:
 * ```typescript
 * const sessionService = new SessionService(contextManager);
 *
 * // Initialize for current project
 * const session = await sessionService.initializeForProject(process.cwd());
 *
 * // Auto-name from first message
 * await sessionService.autoName(conversationId, "Build a todo app");
 *
 * // Switch to different session
 * const newSession = await sessionService.switchTo(sessionId);
 * ```
 */
export class SessionService {
  private currentSession: Session | null = null;

  constructor(private contextManager: ContextManager) {}

  /**
   * Initialize session for a project
   *
   * This applies the Abstraction principle:
   * - Agent just calls this method
   * - Doesn't need to know about:
   *   - How we check for existing sessions
   *   - How we load sessions
   *   - How we create new sessions
   *   - How we handle conversations
   *
   * @param projectPath - Absolute path to the project directory
   * @returns The initialized session
   */
  async initializeForProject(projectPath: string): Promise<Session> {
    // Try to find existing session for this project
    const sessions = await this.contextManager.listSessions();
    const existingSession = sessions.find((s) => s.project === projectPath);

    if (existingSession) {
      // Load existing session
      return await this.loadExisting(existingSession);
    } else {
      // Create new session
      return await this.createNew(projectPath);
    }
  }

  /**
   * Auto-name session from first user message
   *
   * This encapsulates the logic for:
   * - Checking if this is the first message
   * - Checking if session has default name
   * - Generating appropriate name
   * - Updating the session
   *
   * @param conversationId - ID of the conversation
   * @param firstMessage - The user's first message
   */
  async autoName(conversationId: string, firstMessage: string): Promise<void> {
    if (!conversationId) return;

    // Check if this is the first message
    const messages = await this.contextManager.getConversationMessages(
      conversationId
    );

    // Only auto-name on the first user message
    if (messages.length !== 1) return;

    // Get current session
    const sessions = await this.contextManager.listSessions();
    const currentSession = sessions.find(
      (s) => s.id === this.currentSession?.id
    );

    if (!currentSession) return;

    // Only rename if it has the default date-based name
    const hasDefaultName =
      currentSession.name.startsWith("Session ") &&
      currentSession.name.includes("/");

    if (!hasDefaultName) return;

    // Generate smart session name from first message
    const sessionName = generateSessionName(firstMessage);

    // Update session name
    await this.contextManager.updateSession({
      name: sessionName,
    });

    // Update our cached session
    if (this.currentSession) {
      this.currentSession.name = sessionName;
    }

    console.log(`📝 Auto-named session: "${sessionName}"`);
  }

  /**
   * Switch to a different session
   *
   * This encapsulates:
   * - Loading the session
   * - Updating current session reference
   * - Returning session details
   *
   * @param sessionId - ID of session to switch to
   * @returns The switched-to session
   */
  async switchTo(sessionId: string): Promise<Session> {
    // Load session in ContextManager
    await this.contextManager.loadSession(sessionId);

    // Get the session details
    const sessions = await this.contextManager.listSessions();
    const session = sessions.find((s) => s.id === sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update current session reference
    this.currentSession = session as Session;

    console.log(`✅ Switched to session: ${session.name}`);

    return this.currentSession;
  }

  /**
   * Get conversation messages for current session
   *
   * @param limit - Maximum number of messages to retrieve (optional)
   * @returns Array of messages
   */
  async getConversationMessages(limit?: number): Promise<StoredMessage[]> {
    if (!this.currentSession?.currentConversationId) {
      return [];
    }

    return await this.contextManager.getConversationMessages(
      this.currentSession.currentConversationId,
      limit
    );
  }

  /**
   * Create a new session for a project
   *
   * @param sessionName - Name for the new session
   * @param projectPath - Project path
   * @returns Created session
   */
  async createSession(
    sessionName: string,
    projectPath: string
  ): Promise<Session> {
    const session = await this.contextManager.createSession(
      sessionName,
      projectPath
    );

    this.currentSession = session as Session;

    console.log(`✅ Created new session: ${sessionName}`);

    return this.currentSession;
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Get session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSession?.id || null;
  }

  /**
   * Get current conversation ID
   */
  getCurrentConversationId(): string | null {
    return this.currentSession?.currentConversationId || null;
  }

  // ============================================
  // Private Helper Methods (Encapsulation!)
  // ============================================

  /**
   * Load an existing session
   *
   * Private method - internal implementation detail
   * Agent doesn't need to know this exists
   */
  private async loadExisting(existingSession: any): Promise<Session> {
    this.currentSession = existingSession as Session;

    console.log(`Loaded session: ${existingSession.name}`);

    // Load session into ContextManager
    await this.contextManager.loadSession(existingSession.id);

    // Ensure conversation exists
    if (!existingSession.currentConversationId) {
      const conversation = await this.contextManager.createConversation();
      await this.contextManager.updateSession({
        currentConversationId: conversation.id,
      });

      // Update our cached session
      this.currentSession.currentConversationId = conversation.id;
    }

    return this.currentSession;
  }

  /**
   * Create a new session
   *
   * Private method - internal implementation detail
   * Agent doesn't need to know this exists
   */
  private async createNew(projectPath: string): Promise<Session> {
    const session = await this.contextManager.createSession(
      `Session ${new Date().toLocaleDateString()}`,
      projectPath
    );

    this.currentSession = session as Session;

    console.log(`Created new session for project: ${projectPath}`);

    return this.currentSession;
  }
}
