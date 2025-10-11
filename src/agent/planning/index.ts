/**
 * Planning Module
 *
 * Handles creation and parsing of execution plans from AI responses.
 *
 * This module is organized into three main concerns:
 * - Plan Creation: High-level orchestration and context loading
 * - JSON Parsing: Extracting and validating JSON from AI responses
 * - Fallback Converter: Handling non-standard AI response formats
 */

// Main plan creation functions
export {
  createPlan,
  createPlanningPrompt,
  isPlanNeeded,
  loadReadmeContext,
} from "./planCreation.js";

// JSON parsing and validation
export { extractJsonFromResponse, parsePlan } from "./jsonParsing.js";

// Fallback converter for AI format issues
export { convertFunctionCallToPlan } from "./fallbackConverter.js";
