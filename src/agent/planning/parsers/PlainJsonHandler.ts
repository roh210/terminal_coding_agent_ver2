/**
 * PlainJsonHandler
 *
 * Extracts plain JSON using brace counting.
 * Handles raw JSON without markdown formatting.
 *
 * Single Responsibility: Parse plain JSON with validation
 */

import { BaseHandler } from "./BaseHandler.js";
import type { ParserResult } from "./types.js";

export class PlainJsonHandler extends BaseHandler {
  protected tryParse(content: string): ParserResult | null {
    // Clean content (remove headers, prefixes)
    const cleaned = this.cleanContent(content);

    // Find opening brace
    const startIndex = cleaned.indexOf("{");
    if (startIndex === -1) {
      this.logAttempt("PlainJsonHandler", false);
      return null;
    }

    // Extract using brace counting
    const jsonString = this.extractWithBraceCounting(cleaned, startIndex);

    if (!jsonString) {
      this.logAttempt("PlainJsonHandler", false);
      return null;
    }

    // Validate it has plan structure (goal + steps)
    if (this.hasValidPlanStructure(jsonString)) {
      this.logAttempt("PlainJsonHandler", true);
      return {
        success: true,
        jsonString,
        handlerName: "PlainJsonHandler",
      };
    }

    this.logAttempt("PlainJsonHandler", false);
    return null;
  }

  /**
   * Clean content by removing headers and prefixes
   */
  private cleanContent(content: string): string {
    return content
      .replace(/===.*?===/g, "") // Remove === PLAN === style headers
      .replace(/!function_call:\s*/g, ""); // Remove !function_call: prefix
  }

  /**
   * Validate JSON has plan structure (goal and steps fields)
   */
  private hasValidPlanStructure(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      return (
        parsed.goal &&
        parsed.steps &&
        Array.isArray(parsed.steps) &&
        parsed.steps.length > 0
      );
    } catch {
      return false;
    }
  }
}
