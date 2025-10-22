import { Command } from "./types.js";

/**
 * HelpCommand - Shows available commands
 * 
 * This is a simple command with no dependencies.
 * Demonstrates Single Responsibility Principle:
 * - Only responsible for showing help text
 * - Easy to test
 * - Easy to modify help text without affecting other code
 */
export class HelpCommand implements Command {
  getName(): string {
    return "/help";
  }

  async execute(): Promise<void> {
    console.log("\n📚 Available Commands:\n");
    console.log("  /help      - Show this help message");
    console.log("  /sessions  - Switch between project sessions");
    console.log("  /history   - View conversation history");
    console.log("");
  }
}
