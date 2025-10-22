import OpenAI from "openai";
import { AgentDependencies, Plan } from "./types.js";
import { createPlan } from "./planning/index.js";
import { formatterService } from "./formatting/index.js";
import { executeToolCalls } from "./execution/index.js";
import {
  runInference,
  extractAssistantMessage,
  hasToolCalls,
} from "./inference.js";
import { ContextManager } from "./context/index.js";
import { extractFileReferences } from "./utils/stringUtils.js";
import { createUIRenderer, type UIRenderer } from "./services/UIRenderer.js";
import { SessionService } from "./services/SessionService.js";
import { CommandService } from "./services/CommandService.js";

export class Agent {
  private conversation: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  private readUserInput: boolean = true;
  private contextManager: ContextManager;
  private sessionService: SessionService;
  private commandService: CommandService;
  private currentConversationId: string | null = null;
  private sessionId: string | null = null;
  private uiRenderer: UIRenderer;

  constructor(private deps: AgentDependencies) {
    this.contextManager = new ContextManager();
    this.sessionService = new SessionService(this.contextManager); // Dependency Injection!
    this.uiRenderer = createUIRenderer(); // Factory creates our renderer

    // Initialize CommandService with dependencies (Dependency Injection!)
    this.commandService = new CommandService({
      uiRenderer: this.uiRenderer,
      contextManager: this.contextManager,
      sessionService: this.sessionService,
      getCurrentConversationId: () => this.currentConversationId,
      getCurrentSessionId: () => this.sessionId,

      // Callback when session is switched
      onSessionSwitch: (sessionData) => {
        this.sessionId = sessionData.sessionId;
        this.currentConversationId = sessionData.conversationId;
        this.conversation = []; // Clear to prevent context leakage

        // Load messages into conversation
        for (const msg of sessionData.messages) {
          this.conversation.push({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
          });
        }
      },

      // Callback when new session is created
      onSessionCreate: (sessionData) => {
        this.sessionId = sessionData.sessionId;
        this.currentConversationId = sessionData.conversationId;
        this.conversation = []; // Fresh start
      },
    });
  }

  async run() {
    console.log("Chat with AI Agent (use 'ctrl-c' to exit)");

    // Initialize session for this project
    await this.initializeSession();

    while (true) {
      try {
        if (this.readUserInput) {
          const shouldProceed = await this.handleUserInput();
          if (!shouldProceed) {
            continue; // Skip inference if plan was rejected
          }
        }
        await this.processInference();
      } catch (error) {
        console.error("Error: ", error);
        this.readUserInput = true;
      }
    }
  }

  /**
   * Handles user input and planning phase
   * Returns true if should proceed to inference, false if should skip
   */
  private async handleUserInput(): Promise<boolean> {
    const userInput = await this.deps.getUserMessage();

    // Check for slash commands
    if (userInput.startsWith("/")) {
      const handled = await this.handleSlashCommand(userInput);
      if (handled) {
        return false; // Don't proceed to inference for slash commands
      }
    }

    const userMessage: OpenAI.Chat.ChatCompletionMessageParam = {
      role: "user",
      content: userInput,
    };
    this.conversation.push(userMessage);

    // Track user message in context
    if (this.currentConversationId) {
      const fileReferences = extractFileReferences(userInput);
      await this.contextManager.addMessage(
        this.currentConversationId,
        "user",
        userInput,
        { fileReferences }
      );

      // Auto-name session from first message
      await this.autoNameSession(userInput);
    }

    const plan = await createPlan(this.deps.client, this.conversation);

    if (plan) {
      const planApproved = await this.handlePlanApproval(plan);
      if (!planApproved) {
        this.deps.showAgentMessage(
          "Plan rejected. Please refine your request."
        );
        // Remove the user message from conversation since we're not executing
        this.conversation.pop();
        this.readUserInput = true;
        return false; // Don't proceed to inference
      }
    }

    return true; // Proceed to inference
  }

  /**
   * Shows plan to user and gets approval
   */
  private async handlePlanApproval(plan: Plan): Promise<boolean> {
    const planText = formatterService.formatPlan(plan);
    console.log(planText);

    const approved = await this.deps.getPlanApproval("Execute this plan?");

    if (approved) {
      // Add plain text version to conversation (no ANSI codes)
      const planPlainText = formatterService.formatPlanPlainText(plan);
      this.conversation.push({
        role: "assistant",
        content: `I will execute the following plan:\n${planPlainText}`,
      });
    }

    return approved;
  }

  /**
   * Runs inference and handles the response
   */
  private async processInference(): Promise<void> {
    const result = await runInference(
      this.deps.client,
      this.conversation,
      this.deps.tools
    );

    const message = extractAssistantMessage(result);
    this.conversation.push(message);

    // Track AI response in context
    if (this.currentConversationId && message.content) {
      const toolCalls = message.tool_calls
        ? message.tool_calls.map((tc) => {
            // Handle both standard and custom tool calls
            const func = "function" in tc ? tc.function : null;
            return {
              tool: func?.name || "unknown",
              args: func?.arguments ? JSON.parse(func.arguments) : {},
            };
          })
        : undefined;

      await this.contextManager.addMessage(
        this.currentConversationId,
        "assistant",
        message.content,
        { toolCalls }
      );
    }

    if (hasToolCalls(message)) {
      const toolResults = await executeToolCalls(
        message.tool_calls!,
        this.deps.tools,
        this.deps.getToolConsent
      );

      this.conversation.push(...toolResults);
      this.readUserInput = false;
    } else {
      if (message.content) {
        this.deps.showAgentMessage(message.content);
      }
      this.readUserInput = true;
    }
  }

  /**
   * Initialize session and create/load conversation
   *
   * Now uses SessionService (Abstraction + SRP):
   * - Agent doesn't know HOW sessions are loaded/created
   * - SessionService handles all the complexity
   * - Clean, simple API call
   */
  private async initializeSession(): Promise<void> {
    const projectPath = process.cwd();

    // Let SessionService handle all the complexity!
    const session = await this.sessionService.initializeForProject(projectPath);

    // Agent just stores the IDs it needs
    this.sessionId = session.id;
    this.currentConversationId = session.currentConversationId;
  }

  /**
   * Auto-name session based on first user message
   *
   * Now uses SessionService (SRP):
   * - All auto-naming logic encapsulated in SessionService
   * - Agent just delegates to the service
   */
  private async autoNameSession(firstMessage: string): Promise<void> {
    if (!this.currentConversationId) return;

    // SessionService handles all the complexity!
    await this.sessionService.autoName(
      this.currentConversationId,
      firstMessage
    );
  }

  /**
   * Handle slash commands using CommandService
   *
   * Now uses Command Pattern:
   * - Agent doesn't know about specific commands
   * - CommandService manages all command execution
   * - Easy to add new commands (just register them)
   * - 91% code reduction (23 lines → 2 lines!)
   */
  private async handleSlashCommand(input: string): Promise<boolean> {
    return await this.commandService.execute(input.trim());
  }
}
