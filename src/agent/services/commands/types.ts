import { UIRenderer } from "../UIRenderer.js";
import { ContextManager } from "../../context/index.js";
import { SessionService } from "../SessionService.js";

/**
 * Command Interface
 * 
 * Represents a single executable command in the system.
 * Each command knows its name and how to execute itself.
 * 
 * This follows the Command Pattern:
 * - Encapsulates a request as an object
 * - Allows parameterization of clients with different requests
 * - Supports queuing, logging, and undoable operations
 */
export interface Command {
  /**
   * Get the command name (e.g., "/help", "/sessions")
   */
  getName(): string;

  /**
   * Execute the command
   */
  execute(): Promise<void>;
}

/**
 * Dependencies that commands might need
 * 
 * Using Dependency Injection pattern:
 * - Commands receive what they need through constructor
 * - Makes commands testable (can inject mocks)
 * - Loose coupling (commands don't create dependencies)
 */
export interface CommandDependencies {
  /** UI rendering service for React/Ink components */
  uiRenderer: UIRenderer;

  /** Context/database manager */
  contextManager: ContextManager;

  /** Session management service */
  sessionService: SessionService;

  /** 
   * Getter for current conversation ID
   * Using a function so we always get the latest value
   */
  getCurrentConversationId: () => string | null;

  /**
   * Getter for current session ID
   */
  getCurrentSessionId: () => string | null;

  /**
   * Callback to update agent's conversation state after session switch
   */
  onSessionSwitch?: (sessionData: {
    sessionId: string;
    conversationId: string;
    messages: Array<{ role: string; content: string }>;
  }) => void;

  /**
   * Callback to update agent's state after creating new session
   */
  onSessionCreate?: (sessionData: {
    sessionId: string;
    conversationId: string;
  }) => void;
}
