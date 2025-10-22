/**
 * ParserChain
 *
 * Orchestrates the Chain of Responsibility for parsing LLM responses.
 * Chains together multiple handlers in order of preference.
 *
 * Default order:
 * 1. MarkdownHandler (most common, cleanest format)
 * 2. PlainJsonHandler (second most common)
 * 3. FunctionCallHandler (fallback for function_call: format)
 * 4. RawFunctionCallHandler (last resort for raw {call} format)
 */

import { COLORS } from "../../constants.js";
import type { IParserHandler, ParserResult } from "./types.js";
import { MarkdownHandler } from "./MarkdownHandler.js";
import { PlainJsonHandler } from "./PlainJsonHandler.js";
import { FunctionCallHandler } from "./FunctionCallHandler.js";
import { RawFunctionCallHandler } from "./RawFunctionCallHandler.js";

export class ParserChain {
  private chain: IParserHandler;

  constructor() {
    // Build the default chain in order of preference
    const markdownHandler = new MarkdownHandler();
    const plainJsonHandler = new PlainJsonHandler();
    const functionCallHandler = new FunctionCallHandler();
    const rawFunctionCallHandler = new RawFunctionCallHandler();

    // Chain them together
    // setNext returns the next handler, allowing method chaining
    markdownHandler
      .setNext(plainJsonHandler)
      .setNext(functionCallHandler)
      .setNext(rawFunctionCallHandler);

    this.chain = markdownHandler;
  }

  /**
   * Process content through the entire chain
   * Returns the first successful result, or null if all handlers fail
   */
  parse(content: string): ParserResult | null {
    console.log(`${COLORS.cyan}→ Starting parser chain...${COLORS.reset}`);
    const result = this.chain.handle(content);

    if (!result) {
      console.log(`${COLORS.red}✗ All parsers failed${COLORS.reset}`);
    }

    return result;
  }

  /**
   * Create a custom chain with specific handlers in custom order
   * Useful for testing or special parsing scenarios
   *
   * Example:
   * const chain = ParserChain.custom([
   *   new FunctionCallHandler(),  // Try this first
   *   new MarkdownHandler()        // Then this
   * ]);
   */
  static custom(handlers: IParserHandler[]): ParserChain {
    if (handlers.length === 0) {
      throw new Error("ParserChain requires at least one handler");
    }

    const chain = new ParserChain();

    // Chain handlers together
    for (let i = 0; i < handlers.length - 1; i++) {
      handlers[i].setNext(handlers[i + 1]);
    }

    chain.chain = handlers[0];
    return chain;
  }
}
