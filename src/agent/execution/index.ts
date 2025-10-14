/**
 * Execution Module
 *
 * Provides sandboxed code execution capabilities using Daytona API.
 * Ensures safe execution of user code in isolated cloud environments.
 */

// Daytona API-based sandbox
export {
  DaytonaManager,
  type DaytonaExecutionResult,
  type DaytonaExecutionOptions,
  type DaytonaWorkspace,
} from "./daytonaManager.js";
