import { COLORS } from "../constants.js";
import { diffLines, Change, createPatch, diffTrimmedLines } from "diff";

/**
 * DiffLine represents a single line in a diff
 */
interface DiffLine {
  type: "added" | "removed" | "context" | "header";
  content: string;
  lineNumber?: number;
}

/**
 * DiffViewer - Formats git diffs with ANSI colors
 */
export class DiffViewer {
  /**
   * Parse raw git diff into structured format
   */
  static parseDiff(rawDiff: string): DiffLine[] {
    if (!rawDiff.trim()) {
      return [];
    }

    const lines = rawDiff.split("\n");
    const diffLines: DiffLine[] = [];

    for (const line of lines) {
      if (
        line.startsWith("diff --git") ||
        line.startsWith("index ") ||
        line.startsWith("---") ||
        line.startsWith("+++")
      ) {
        diffLines.push({ type: "header", content: line });
      } else if (line.startsWith("+")) {
        diffLines.push({ type: "added", content: line });
      } else if (line.startsWith("-")) {
        diffLines.push({ type: "removed", content: line });
      } else if (line.startsWith("@@")) {
        diffLines.push({ type: "header", content: line });
      } else {
        diffLines.push({ type: "context", content: line });
      }
    }

    return diffLines;
  }

  /**
   * Format diff with ANSI colors
   */
  static formatDiff(rawDiff: string): string {
    const diffLines = this.parseDiff(rawDiff);

    if (diffLines.length === 0) {
      return `${COLORS.dim}No changes${COLORS.reset}`;
    }

    return diffLines.map((line) => this.formatLine(line)).join("\n");
  }

  /**
   * Format a single diff line with appropriate color
   */
  private static formatLine(line: DiffLine): string {
    switch (line.type) {
      case "added":
        return `${COLORS.green}${line.content}${COLORS.reset}`;
      case "removed":
        return `${COLORS.red}${line.content}${COLORS.reset}`;
      case "header":
        return `${COLORS.cyan}${line.content}${COLORS.reset}`;
      case "context":
        return `${COLORS.dim}${line.content}${COLORS.reset}`;
      default:
        return line.content;
    }
  }

  /**
   * Create a side-by-side diff view (simplified version)
   */
  static formatSideBySide(rawDiff: string, maxWidth: number = 80): string {
    const diffLines = this.parseDiff(rawDiff);

    if (diffLines.length === 0) {
      return `${COLORS.dim}No changes${COLORS.reset}`;
    }

    const halfWidth = Math.floor(maxWidth / 2) - 2;
    const result: string[] = [];

    result.push(`${COLORS.cyan}${"─".repeat(maxWidth)}${COLORS.reset}`);
    result.push(
      `${COLORS.bold}${"BEFORE".padEnd(halfWidth)} │ ${"AFTER".padStart(
        halfWidth
      )}${COLORS.reset}`
    );
    result.push(`${COLORS.cyan}${"─".repeat(maxWidth)}${COLORS.reset}`);

    let removedLines: string[] = [];
    let addedLines: string[] = [];

    for (const line of diffLines) {
      if (line.type === "removed") {
        removedLines.push(line.content.substring(1)); // Remove '-' prefix
      } else if (line.type === "added") {
        addedLines.push(line.content.substring(1)); // Remove '+' prefix
      } else if (
        line.type === "context" &&
        (removedLines.length > 0 || addedLines.length > 0)
      ) {
        // Flush accumulated changes
        this.flushSideBySideChanges(
          result,
          removedLines,
          addedLines,
          halfWidth
        );
        removedLines = [];
        addedLines = [];
      }
    }

    // Flush any remaining changes
    this.flushSideBySideChanges(result, removedLines, addedLines, halfWidth);

    result.push(`${COLORS.cyan}${"─".repeat(maxWidth)}${COLORS.reset}`);

    return result.join("\n");
  }

  /**
   * Helper to flush accumulated side-by-side changes
   */
  private static flushSideBySideChanges(
    result: string[],
    removedLines: string[],
    addedLines: string[],
    halfWidth: number
  ): void {
    const maxLines = Math.max(removedLines.length, addedLines.length);

    for (let i = 0; i < maxLines; i++) {
      const removed = removedLines[i] || "";
      const added = addedLines[i] || "";

      const removedFormatted = this.truncate(removed, halfWidth);
      const addedFormatted = this.truncate(added, halfWidth);

      const removedColored = removed
        ? `${COLORS.red}${removedFormatted}${COLORS.reset}`
        : removedFormatted;
      const addedColored = added
        ? `${COLORS.green}${addedFormatted}${COLORS.reset}`
        : addedFormatted;

      result.push(`${removedColored.padEnd(halfWidth + 10)} │ ${addedColored}`); // +10 for ANSI codes
    }
  }

  /**
   * Truncate string to fit width
   */
  private static truncate(str: string, maxWidth: number): string {
    if (str.length <= maxWidth) {
      return str.padEnd(maxWidth);
    }
    return str.substring(0, maxWidth - 3) + "...";
  }

  /**
   * Get diff statistics (additions, deletions)
   */
  static getDiffStats(rawDiff: string): {
    additions: number;
    deletions: number;
  } {
    const diffLines = this.parseDiff(rawDiff);

    const additions = diffLines.filter((l) => l.type === "added").length;
    const deletions = diffLines.filter((l) => l.type === "removed").length;

    return { additions, deletions };
  }

  /**
   * Format diff stats as a summary line
   */
  static formatDiffStats(rawDiff: string): string {
    const { additions, deletions } = this.getDiffStats(rawDiff);

    if (additions === 0 && deletions === 0) {
      return `${COLORS.dim}No changes${COLORS.reset}`;
    }

    const parts: string[] = [];

    if (additions > 0) {
      parts.push(`${COLORS.green}+${additions}${COLORS.reset}`);
    }

    if (deletions > 0) {
      parts.push(`${COLORS.red}-${deletions}${COLORS.reset}`);
    }

    return parts.join(" ");
  }

  /**
   * Format a line-by-line diff with colors and line numbers
   * Similar to git diff output - uses smart trimming to ignore trailing whitespace
   */
  static formatLineDiff(
    before: string,
    after: string,
    filePath: string,
    contextLines: number = 3
  ): string {
    // Use diffTrimmedLines for smarter comparison (ignores leading/trailing whitespace per line)
    const changes = diffTrimmedLines(before, after);

    const result: string[] = [];

    // Add file header (git-style)
    result.push(`${COLORS.cyan}--- a/${filePath}${COLORS.reset}`);
    result.push(`${COLORS.cyan}+++ b/${filePath}${COLORS.reset}`);

    let additions = 0;
    let deletions = 0;
    let oldLineNum = 1;
    let newLineNum = 1;

    // Calculate line ranges for hunk header
    let oldLines = 0;
    let newLines = 0;
    for (const change of changes) {
      const count = change.count || 0;
      if (change.removed) oldLines += count;
      else if (change.added) newLines += count;
      else {
        oldLines += count;
        newLines += count;
      }
    }

    // Add hunk header @@ -old +new @@
    result.push(
      `${COLORS.cyan}@@ -${oldLineNum},${oldLines} +${newLineNum},${newLines} @@${COLORS.reset}`
    );

    // Process each change
    for (const change of changes) {
      const lines = change.value.split("\n").filter((l, i, arr) => {
        // Keep all lines except the last empty one (from trailing newline)
        return i < arr.length - 1 || l.length > 0;
      });

      for (const line of lines) {
        if (change.added) {
          result.push(`${COLORS.green}+${line}${COLORS.reset}`);
          additions++;
          newLineNum++;
        } else if (change.removed) {
          result.push(`${COLORS.red}-${line}${COLORS.reset}`);
          deletions++;
          oldLineNum++;
        } else {
          // Context line - unchanged
          result.push(`${COLORS.dim} ${line}${COLORS.reset}`);
          oldLineNum++;
          newLineNum++;
        }
      }
    }

    // Add summary stats
    result.push("");
    const stats = `${COLORS.bold}1 file changed${COLORS.reset}`;
    const addStats =
      additions > 0
        ? `${COLORS.green}${additions} insertions(+)${COLORS.reset}`
        : "";
    const delStats =
      deletions > 0
        ? `${COLORS.red}${deletions} deletions(-)${COLORS.reset}`
        : "";

    const statsParts = [stats, addStats, delStats].filter((s) => s.length > 0);
    result.push(statsParts.join(", "));

    return result.join("\n");
  }
}
