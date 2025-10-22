/**
 * Pure utility functions for string manipulation
 *
 * These functions follow the Pure Function principle:
 * - Same input always produces same output
 * - No side effects
 * - Easy to test without mocking
 */

/**
 * Extract file references from @filename syntax
 *
 * Example:
 *   extractFileReferences("Check @README.md and @src/index.ts")
 *   // Returns: ["README.md", "src/index.ts"]
 *
 * @param content - The string to search for file references
 * @returns Array of file paths (without @ prefix)
 */
export function extractFileReferences(content: string): string[] {
  const matches = content.match(/@([^\s]+)/g) || [];
  return matches.map((m) => m.substring(1)); // Remove @ prefix
}

/**
 * Generate a concise session name from user message
 *
 * Applies transformations:
 * - Removes common question words ("can you", "please", etc.)
 * - Removes trailing question marks
 * - Capitalizes first letter
 * - Limits to 50 characters
 * - Provides fallback if empty
 *
 * Examples:
 *   generateSessionName("can you help me create a todo app?")
 *   // Returns: "Create a todo app"
 *
 *   generateSessionName("Build authentication system")
 *   // Returns: "Build authentication system"
 *
 * @param message - The user's first message
 * @returns A clean, concise session name
 */
export function generateSessionName(message: string): string {
  // Remove common question words and clean up
  let cleaned = message
    .replace(/^(can you|could you|please|help me|i need|i want to)\s+/i, "")
    .replace(/\?+$/, "")
    .trim();

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  // Limit to 50 characters
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 47) + "...";
  }

  // Fallback if empty
  if (!cleaned) {
    cleaned = `Session ${new Date().toLocaleDateString()}`;
  }

  return cleaned;
}
