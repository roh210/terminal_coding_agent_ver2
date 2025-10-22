/**
 * Parser Types
 *
 * Interfaces and types for the Chain of Responsibility parsing pattern.
 */

/**
 * Result from a parser handler
 */
export interface ParserResult {
  success: boolean;
  jsonString: string | null;
  handlerName: string;
}

/**
 * Parser handler interface (Chain of Responsibility pattern)
 *
 * Each handler in the chain can either:
 * 1. Process the content and return a result
 * 2. Pass the content to the next handler
 */
export interface IParserHandler {
  /**
   * Set the next handler in the chain
   * Returns the handler to allow chaining: h1.setNext(h2).setNext(h3)
   */
  setNext(handler: IParserHandler): IParserHandler;

  /**
   * Process the content and return result or pass to next handler
   * Returns null if this handler and all subsequent handlers fail
   */
  handle(content: string): ParserResult | null;
}

/**
 * Parsing context passed through the chain
 * Useful for tracking what's been tried and for debugging
 */
export interface ParsingContext {
  originalContent: string;
  cleanedContent: string;
  attemptedHandlers: string[];
}
