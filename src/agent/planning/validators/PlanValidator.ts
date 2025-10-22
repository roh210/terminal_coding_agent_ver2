/**
 * PlanValidator
 *
 * Validates plan JSON structure and step integrity.
 * Separated from parsing logic for single responsibility.
 *
 * Single Responsibility: Validate plan structure
 */

import type { Plan } from "../../types.js";
import { COLORS, ICONS } from "../../constants.js";

export class PlanValidator {
  /**
   * Validates a plan JSON string and returns parsed Plan or null
   *
   * Validates:
   * 1. Valid JSON syntax
   * 2. Has 'goal' field (string)
   * 3. Has 'steps' field (array)
   * 4. Each step has 'action', 'tool', and 'reasoning' fields
   */
  static validate(jsonString: string): Plan | null {
    try {
      const parsed = JSON.parse(jsonString) as Plan;

      // Validate plan structure
      if (!this.hasValidStructure(parsed)) {
        return null;
      }

      // Validate each step
      if (!this.hasValidSteps(parsed.steps)) {
        return null;
      }

      return parsed;
    } catch (error) {
      this.logError(jsonString, error);
      return null;
    }
  }

  /**
   * Validates the overall plan structure
   */
  private static hasValidStructure(parsed: Plan): boolean {
    if (!parsed.goal || !parsed.steps || !Array.isArray(parsed.steps)) {
      console.error(
        `\n${COLORS.red}${ICONS.error} Invalid plan structure:${COLORS.reset}`
      );
      console.error(
        `${COLORS.gray}Missing required fields: goal or steps${COLORS.reset}`
      );
      console.error(`${COLORS.gray}Parsed plan:${COLORS.reset}`, parsed);
      return false;
    }

    if (parsed.steps.length === 0) {
      console.error(
        `\n${COLORS.red}${ICONS.error} Plan has no steps${COLORS.reset}`
      );
      return false;
    }

    return true;
  }

  /**
   * Validates all steps in the plan
   */
  private static hasValidSteps(steps: Plan["steps"]): boolean {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      if (!step.action || !step.tool || !step.reasoning) {
        console.error(
          `\n${COLORS.red}${ICONS.error} Invalid step structure at index ${i}:${COLORS.reset}`
        );
        console.error(
          `${COLORS.gray}Step missing required fields (action, tool, or reasoning)${COLORS.reset}`
        );
        console.error(`${COLORS.gray}Invalid step:${COLORS.reset}`, step);
        return false;
      }

      // Check fields are non-empty strings
      if (
        typeof step.action !== "string" ||
        typeof step.tool !== "string" ||
        typeof step.reasoning !== "string" ||
        step.action.trim() === "" ||
        step.tool.trim() === "" ||
        step.reasoning.trim() === ""
      ) {
        console.error(
          `\n${COLORS.red}${ICONS.error} Step ${i} has empty or non-string fields${COLORS.reset}`
        );
        console.error(`${COLORS.gray}Invalid step:${COLORS.reset}`, step);
        return false;
      }
    }

    return true;
  }

  /**
   * Logs detailed parse error information
   */
  private static logError(jsonString: string, error: unknown): void {
    console.error(
      `\n${COLORS.red}${ICONS.error} Failed to parse plan JSON:${COLORS.reset}`
    );
    console.error(`${COLORS.gray}JSON String:${COLORS.reset}`, jsonString);
    console.error(
      `${COLORS.gray}Error:${COLORS.reset}`,
      error instanceof Error ? error.message : String(error)
    );
  }
}
