/**
 * Formatter Types and Interfaces
 *
 * Defines the Strategy Pattern for formatting.
 * Each formatter implements the Formatter interface.
 */

/**
 * Format styles available for output
 */
export type FormatStyle = "colored" | "plain" | "json";

/**
 * Options for formatting
 */
export interface FormatOptions {
  /** Output style (colored terminal, plain text, or JSON) */
  style?: FormatStyle;

  /** Maximum length before truncation */
  maxLength?: number;

  /** Include metadata (character count, line count, etc.) */
  includeMetadata?: boolean;
}

/**
 * Base Formatter Interface
 *
 * This is the Strategy Pattern interface.
 * Each concrete formatter implements this.
 *
 * Example:
 *   const formatter = new PlanFormatter();
 *   const output = formatter.format(plan, { style: 'colored' });
 */
export interface Formatter<TData = any> {
  /**
   * Format data according to the strategy
   *
   * @param data - The data to format
   * @param options - Formatting options
   * @returns Formatted string
   */
  format(data: TData, options?: FormatOptions): string;
}

/**
 * Tool formatting data
 */
export interface ToolFormatData {
  tool: string;
  params?: Record<string, any>;
  result: any; // Can be string, object, or any other type depending on tool
}

/**
 * Consent formatting data
 */
export interface ConsentFormatData {
  toolName: string;
  args: Record<string, unknown>;
}

/**
 * Error formatting data
 */
export interface ErrorFormatData {
  toolName: string;
  errorMessage: string;
}
