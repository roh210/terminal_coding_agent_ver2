/**
 * Formatting Module - Phase 6
 *
 * Central export point for all formatters
 * Makes it easy to import from agent.ts
 */

// Export types
export * from "./types.js";

// Export formatters
export { PlanFormatter } from "./PlanFormatter.js";
export { ToolFormatter } from "./ToolFormatter.js";
export { ConsentFormatter } from "./ConsentFormatter.js";

// Export service (facade)
export { FormatterService, formatterService } from "./FormatterService.js";
