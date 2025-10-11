import fuzzysort from "fuzzysort";
import { TOOL_NAMES } from "../constants.js";

/**
 * Filters items using fuzzy matching
 * @param query - Search query
 * @param items - Items to filter
 * @param limit - Maximum number of results (default: 10)
 * @returns Filtered and sorted items
 */
export function fuzzyFilter(
  query: string,
  items: string[],
  limit: number = 10
): string[] {
  if (!query || query.trim() === "") {
    return items.slice(0, limit);
  }

  const results = fuzzysort.go(query, items, {
    limit,
    threshold: -10000, // Allow imperfect matches
  });

  return results.map((result) => result.target);
}

/**
 * Filters tool suggestions based on user input
 * @param query - User input
 * @returns Filtered tool names
 */
export function filterTools(query: string): string[] {
  const toolNamesArray = Object.values(TOOL_NAMES);
  return fuzzyFilter(query, toolNamesArray, 5);
}

/**
 * Filters file paths based on user input (removes @ prefix)
 * @param query - User input with @ prefix
 * @param files - Available file paths
 * @returns Filtered file paths
 */
export function filterFiles(query: string, files: string[]): string[] {
  // Remove @ prefix for matching
  const cleanQuery = query.replace(/^@/, "");
  return fuzzyFilter(cleanQuery, files, 10);
}
