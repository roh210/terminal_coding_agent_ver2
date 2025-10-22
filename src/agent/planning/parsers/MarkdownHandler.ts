/**
 * MarkdownHandler
 *
 * Extracts JSON from markdown code blocks.
 * Handles formats like: ```json\n{...}\n``` or ```\n{...}\n```
 *
 * Single Responsibility: Parse markdown-formatted JSON
 */

import { BaseHandler } from "./BaseHandler.js";
import type { ParserResult } from "./types.js";

export class MarkdownHandler extends BaseHandler {
  protected tryParse(content: string): ParserResult | null {
    // Match markdown code blocks with optional "json" language specifier
    const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);

    if (codeBlockMatch && codeBlockMatch[1]) {
      this.logAttempt("MarkdownHandler", true);
      return {
        success: true,
        jsonString: codeBlockMatch[1],
        handlerName: "MarkdownHandler",
      };
    }

    this.logAttempt("MarkdownHandler", false);
    return null;
  }
}
