/**
 * FormatterService - Orchestrator for all formatters
 *
 * Phase 6: Main service that coordinates all formatting strategies
 *
 * Principles Applied:
 * - Facade Pattern: Simple API that hides complexity of multiple formatters
 * - Dependency Injection: Formatters injected (easy to test/mock)
 * - Single Responsibility: Only coordinates formatters, doesn't format itself
 * - Open/Closed: Can add new formatters without modifying this class
 *
 * Benefits:
 * - Clean API for agent.ts to use
 * - All formatters in one place
 * - Easy to swap formatters (DI)
 * - Easy to test (mock formatters)
 */

import { Plan, ToolInput } from "../types.js";
import { FormatOptions } from "./types.js";
import { PlanFormatter } from "./PlanFormatter.js";
import { ToolFormatter } from "./ToolFormatter.js";
import { ConsentFormatter } from "./ConsentFormatter.js";

export class FormatterService {
  private planFormatter: PlanFormatter;
  private toolFormatter: ToolFormatter;
  private consentFormatter: ConsentFormatter;

  constructor(
    planFormatter?: PlanFormatter,
    toolFormatter?: ToolFormatter,
    consentFormatter?: ConsentFormatter
  ) {
    // Dependency Injection: Allow formatters to be injected for testing
    this.planFormatter = planFormatter || new PlanFormatter();
    this.toolFormatter = toolFormatter || new ToolFormatter();
    this.consentFormatter = consentFormatter || new ConsentFormatter();
  }

  /**
   * Format a plan for display
   * Defaults to colored terminal output
   */
  formatPlan(plan: Plan, options?: FormatOptions): string {
    return this.planFormatter.format(plan, options);
  }

  /**
   * Format a plan as plain text (no ANSI codes)
   * For conversation history
   */
  formatPlanPlainText(plan: Plan): string {
    return this.planFormatter.format(plan, { style: "plain" });
  }

  /**
   * Format a plan as JSON
   */
  formatPlanAsJson(plan: Plan): string {
    return this.planFormatter.format(plan, { style: "json" });
  }

  /**
   * Format a plan with both colored and JSON views
   */
  formatPlanWithJson(plan: Plan): string {
    return this.planFormatter.formatWithJson(plan);
  }

  /**
   * Format a tool execution result
   * Routes to appropriate tool-specific formatter
   */
  formatToolResult(
    toolName: string,
    params: Record<string, any>,
    result: any,
    options?: FormatOptions
  ): string {
    return this.toolFormatter.format(
      {
        tool: toolName,
        params,
        result,
      },
      options
    );
  }

  /**
   * Format a tool consent request
   * Shows user what tool is about to be executed
   */
  formatToolConsentRequest(
    toolName: string,
    args: Record<string, unknown>,
    options?: FormatOptions
  ): string {
    return this.consentFormatter.format(
      {
        toolName,
        args,
      },
      options
    );
  }

  /**
   * Format an error message
   * Simple colored error output
   */
  formatError(message: string, options?: FormatOptions): string {
    const style = options?.style || "colored";

    if (style === "json") {
      return JSON.stringify({ error: message }, null, 2);
    }

    const COLORS = {
      red: "\u001b[31m",
      reset: "\u001b[0m",
    };

    if (style === "colored") {
      return `${COLORS.red}Error: ${message}${COLORS.reset}`;
    } else {
      return `Error: ${message}`;
    }
  }
}

// Export singleton instance for convenience
export const formatterService = new FormatterService();
