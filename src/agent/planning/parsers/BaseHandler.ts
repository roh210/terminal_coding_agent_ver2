/**
 * BaseHandler
 *
 * Abstract base class implementing the Chain of Responsibility pattern.
 * Provides the chain mechanism; subclasses implement specific parsing logic.
 */

import { COLORS, ICONS } from "../../constants.js";
import type { IParserHandler, ParserResult } from "./types.js";

export abstract class BaseHandler implements IParserHandler {
  private nextHandler: IParserHandler | null = null;

  /**
   * Set the next handler in the chain
   * Returns the next handler to allow method chaining
   */
  setNext(handler: IParserHandler): IParserHandler {
    this.nextHandler = handler;
    return handler; // Allows: h1.setNext(h2).setNext(h3)
  }

  /**
   * Handle request: try to process, or pass to next handler
   * This is the chain mechanism - subclasses don't override this
   */
  handle(content: string): ParserResult | null {
    const result = this.tryParse(content);

    if (result && result.success) {
      return result;
    }

    // Pass to next handler if exists
    if (this.nextHandler) {
      return this.nextHandler.handle(content);
    }

    // End of chain, no handler succeeded
    return null;
  }

  /**
   * Abstract method: subclasses implement their specific parsing logic
   * Should return ParserResult on success, null to try next handler
   */
  protected abstract tryParse(content: string): ParserResult | null;

  /**
   * Helper: log parsing attempt for debugging
   */
  protected logAttempt(handlerName: string, success: boolean): void {
    const icon = success ? ICONS.success : ICONS.warning;
    const color = success ? COLORS.green : COLORS.yellow;
    const status = success ? "SUCCESS" : "PASS";
    console.log(`${color}${icon} ${handlerName}: ${status}${COLORS.reset}`);
  }

  /**
   * Helper: Extract JSON using brace counting (shared utility)
   * Many handlers need this, so we provide it in the base class
   */
  protected extractWithBraceCounting(
    content: string,
    startIndex: number
  ): string | null {
    let braceCount = 0;
    let endIndex = -1;

    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === "{") braceCount++;
      if (content[i] === "}") braceCount--;

      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      return null;
    }

    return content.substring(startIndex, endIndex + 1);
  }
}
