import { Command, CommandDependencies } from "./types.js";

/**
 * HistoryCommand - Shows conversation history
 *
 * This command demonstrates:
 * - Guard clauses (check for active conversation first)
 * - Dependency Injection (receives UIRenderer)
 * - Configuration (auto-close after 10 seconds)
 *
 * Shows how commands can have different behaviors:
 * - HelpCommand: Simple console output
 * - SessionsCommand: Interactive UI with callbacks
 * - HistoryCommand: UI with auto-close timer
 */
export class HistoryCommand implements Command {
  constructor(private deps: CommandDependencies) {}

  getName(): string {
    return "/history";
  }

  async execute(): Promise<void> {
    const { uiRenderer, getCurrentConversationId } = this.deps;

    const conversationId = getCurrentConversationId();

    // Guard clause - exit early if no conversation
    if (!conversationId) {
      console.log("\n⚠️  No active conversation\n");
      return;
    }

    await uiRenderer(
      "../../components/ConversationHistory.js",
      "ConversationHistory",
      {
        conversationId: conversationId,
      },
      {
        autoClose: 10000, // Auto-close after 10 seconds
        onCleanup: () => {
          console.log("\n💡 Press Enter to continue...\n");
        },
      }
    );
  }
}
