import { Plan } from "../types.js";
import { COLORS, SEPARATOR, ICONS } from "../constants.js";
import { Formatter, FormatOptions } from "./types.js";

/**
 * PlanFormatter - Formats execution plans
 *
 * Applies Strategy Pattern for different plan output formats:
 * - Colored: Beautiful terminal output with ANSI colors
 * - Plain: Simple text for conversation history
 * - JSON: Structured data format
 *
 * Single Responsibility: Only handles plan formatting
 */
export class PlanFormatter implements Formatter<Plan> {
  /**
   * Main format method (Strategy Pattern entry point)
   */
  format(plan: Plan, options?: FormatOptions): string {
    const style = options?.style || "colored";

    switch (style) {
      case "colored":
        return this.formatColored(plan);
      case "plain":
        return this.formatPlain(plan);
      case "json":
        return this.formatJson(plan);
      default:
        return this.formatColored(plan);
    }
  }

  /**
   * Format plan with ANSI colors for terminal display
   *
   * Original: formatPlan() from formatter.ts
   */
  formatColored(plan: Plan): string {
    // Validate plan structure
    if (!plan || !plan.goal || !plan.steps || !Array.isArray(plan.steps)) {
      return `\n${COLORS.red}${ICONS.error} Invalid plan structure${COLORS.reset}\n`;
    }

    const lines: string[] = [];

    // Header with separator
    lines.push("");
    lines.push(`${COLORS.brightCyan}${SEPARATOR}${COLORS.reset}`);
    lines.push(
      `${COLORS.brightCyan}${COLORS.bold}${ICONS.plan} EXECUTION PLAN${COLORS.reset}`
    );
    lines.push(`${COLORS.brightCyan}${SEPARATOR}${COLORS.reset}`);
    lines.push("");

    // Goal
    lines.push(`${COLORS.brightYellow}${ICONS.goal} Goal:${COLORS.reset}`);
    lines.push(`  ${COLORS.yellow}${plan.goal}${COLORS.reset}`);
    lines.push("");

    // Steps
    lines.push(
      `${COLORS.brightGreen}${COLORS.bold}Steps to Execute:${COLORS.reset}`
    );
    lines.push("");

    plan.steps.forEach((step, index) => {
      // Step number and action
      lines.push(
        `${COLORS.brightBlue}${ICONS.step} Step ${index + 1}:${COLORS.reset} ${
          COLORS.bold
        }${step.action}${COLORS.reset}`
      );

      // Tool
      lines.push(
        `  ${COLORS.brightGreen}${ICONS.tool} Tool:${COLORS.reset} ${COLORS.cyan}${step.tool}${COLORS.reset}`
      );

      // Reasoning
      lines.push(
        `  ${COLORS.brightYellow}${ICONS.reasoning} Reasoning:${COLORS.reset} ${COLORS.dim}${step.reasoning}${COLORS.reset}`
      );
      lines.push("");
    });

    // Footer
    lines.push(`${COLORS.brightCyan}${SEPARATOR}${COLORS.reset}`);
    lines.push(
      `${COLORS.gray}${COLORS.dim}Total Steps: ${plan.steps.length}${COLORS.reset}`
    );
    lines.push(`${COLORS.brightCyan}${SEPARATOR}${COLORS.reset}`);

    return lines.join("\n");
  }

  /**
   * Format plan as plain text (no ANSI codes)
   *
   * Use for: Conversation history, logs, non-terminal output
   * Original: formatPlanPlainText() from formatter.ts
   */
  formatPlain(plan: Plan): string {
    const lines: string[] = [];

    lines.push("");
    lines.push("=== EXECUTION PLAN ===");
    lines.push("");
    lines.push(`Goal: ${plan.goal}`);
    lines.push("");
    lines.push("Steps to Execute:");
    lines.push("");

    plan.steps.forEach((step, index) => {
      lines.push(`Step ${index + 1}: ${step.action}`);
      lines.push(`  Tool: ${step.tool}`);
      lines.push(`  Reasoning: ${step.reasoning}`);
      lines.push("");
    });

    lines.push(`Total Steps: ${plan.steps.length}`);
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Format plan as JSON
   *
   * Use for: API responses, data exchange, debugging
   * Original: formatPlanAsJson() from formatter.ts
   */
  formatJson(plan: Plan): string {
    return JSON.stringify(plan, null, 2);
  }

  /**
   * Format plan with both colored and JSON views
   *
   * Use for: Debugging, detailed inspection
   * Original: formatPlanWithJson() from formatter.ts
   */
  formatWithJson(plan: Plan): string {
    const humanReadable = this.formatColored(plan);
    const json = this.formatJson(plan);

    return `${humanReadable}\n\n${COLORS.gray}${COLORS.dim}JSON Representation:${COLORS.reset}\n${COLORS.cyan}${json}${COLORS.reset}\n`;
  }

  /**
   * Validate that a plan has the required structure
   */
  private isValidPlan(plan: Plan): boolean {
    return !!(plan && plan.goal && plan.steps && Array.isArray(plan.steps));
  }
}
