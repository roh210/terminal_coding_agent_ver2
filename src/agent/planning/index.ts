/**
 * Planning Module
 *
 * Handles creation and parsing of execution plans from AI responses.
 *
 * This module is organized into:
 * - Plan Creation: High-level orchestration and context loading
 * - Parsers: Chain of Responsibility for extracting JSON
 * - Validators: Plan structure validation
 */

// Main plan creation functions
export {
  createPlan,
  createPlanningPrompt,
  isPlanNeeded,
  loadReadmeContext,
} from "./planCreation.js";

// Parser chain and handlers (Chain of Responsibility pattern)
export { ParserChain } from "./parsers/index.js";
export type { ParserResult, IParserHandler } from "./parsers/index.js";

// Validators
export { PlanValidator } from "./validators/index.js";

// Legacy exports for backward compatibility (deprecated - use ParserChain and PlanValidator)
export { extractJsonFromResponse, parsePlan } from "./jsonParsing.js";
export { convertFunctionCallToPlan } from "./fallbackConverter.js";
