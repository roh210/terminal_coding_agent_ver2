import { Command, CommandDependencies } from "./types.js";

/**
 * SessionsCommand - Shows session switcher UI
 *
 * This command demonstrates:
 * - Dependency Injection (receives UIRenderer, SessionService, etc.)
 * - Separation of Concerns (delegates UI rendering to UIRenderer)
 * - Encapsulation (hides session switching complexity)
 *
 * The command coordinates between:
 * - UIRenderer (shows the UI)
 * - SessionService (manages session data)
 * - Agent callbacks (updates agent state)
 */
export class SessionsCommand implements Command {
  constructor(private deps: CommandDependencies) {}

  getName(): string {
    return "/sessions";
  }

  async execute(): Promise<void> {
    const {
      uiRenderer,
      contextManager,
      sessionService,
      getCurrentSessionId,
      onSessionSwitch,
      onSessionCreate,
    } = this.deps;

    await uiRenderer(
      "../../components/SessionSwitcher.js",
      "SessionSwitcher",
      {
        contextManager: contextManager,
        currentSessionId: getCurrentSessionId(),
        currentProject: process.cwd(),

        // Handle session switching
        onSessionChange: async (sessionId: string) => {
          // Use SessionService to switch (Abstraction!)
          const session = await sessionService.switchTo(sessionId);

          // Load previous messages using SessionService
          const messages = await sessionService.getConversationMessages(20);

          // Notify agent of the switch
          if (onSessionSwitch) {
            onSessionSwitch({
              sessionId: session.id,
              conversationId: session.currentConversationId,
              messages: messages,
            });
          }

          console.log(`📝 Loaded ${messages.length} previous message(s)\n`);
        },

        // Handle new session creation
        onCreateSession: async () => {
          console.log("\n📝 Creating new session...");
          const projectPath = process.cwd();

          // Use SessionService to create (Abstraction!)
          const session = await sessionService.createSession(
            `Session ${new Date().toLocaleDateString()}`,
            projectPath
          );

          // Notify agent of the new session
          if (onSessionCreate) {
            onSessionCreate({
              sessionId: session.id,
              conversationId: session.currentConversationId,
            });
          }

          console.log(`📝 Starting fresh conversation\n`);
        },

        isOpen: true,
      }
    );
  }
}
