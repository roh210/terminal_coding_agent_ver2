import {
  Command,
  CommandDependencies,
  HelpCommand,
  SessionsCommand,
  HistoryCommand,
} from "./commands/index.js";

/**
 * CommandService - Manages and executes commands
 *
 * This service implements the Command Pattern:
 *
 * KEY PRINCIPLES:
 *
 * 1. Single Responsibility Principle (SRP)
 *    - Only responsible for command management and execution
 *    - Doesn't know HOW commands work (that's their job)
 *
 * 2. Open/Closed Principle
 *    - Open for extension: Add new commands by creating new classes
 *    - Closed for modification: Don't change this service to add commands
 *
 * 3. Dependency Inversion
 *    - Depends on Command interface (abstraction)
 *    - Not coupled to specific command implementations
 *
 * BENEFITS:
 * - Easy to add new commands (just register them)
 * - Easy to test commands in isolation
 * - Could add command history, undo, logging, etc.
 * - Commands are reusable in other contexts
 */
export class CommandService {
  /** Map of command name to command instance */
  private commands = new Map<string, Command>();

  /**
   * Initialize CommandService and register all available commands
   *
   * @param dependencies - Shared dependencies that commands might need
   */
  constructor(dependencies: CommandDependencies) {
    // Register all available commands
    // Each command is a separate class (SRP!)
    this.register(new HelpCommand());
    this.register(new SessionsCommand(dependencies));
    this.register(new HistoryCommand(dependencies));

    // Adding a new command? Just create the class and register it here!
    // No need to modify execute() or any other method.
  }

  /**
   * Register a command
   *
   * Makes the command available for execution.
   * Commands register themselves by their name.
   */
  register(command: Command): void {
    this.commands.set(command.getName(), command);
  }

  /**
   * Execute a command by name
   *
   * @param commandName - The command to execute (e.g., "/help")
   * @returns true if command was handled
   */
  async execute(commandName: string): Promise<boolean> {
    const command = this.commands.get(commandName);

    if (!command) {
      // Command not found - show helpful error
      console.log(`Unknown command: ${commandName}`);
      console.log(`Type /help to see available commands`);
      return true;
    }

    // Execute the command
    // The service doesn't know or care what the command does!
    await command.execute();
    return true;
  }

  /**
   * Get list of all available command names
   *
   * Useful for:
   * - Autocomplete suggestions
   * - Help text generation
   * - Testing
   */
  getAvailableCommands(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Check if a command exists
   *
   * @param commandName - The command name to check
   */
  hasCommand(commandName: string): boolean {
    return this.commands.has(commandName);
  }
}
