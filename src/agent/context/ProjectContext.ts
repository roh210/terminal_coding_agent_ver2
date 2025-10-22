/**
 * ProjectContext - Global context for current working project
 *
 * This singleton stores the project directory where the agent was invoked.
 * All tools should use this to resolve file paths, ensuring the agent works
 * with the user's project, not the agent's installation directory.
 *
 * Usage:
 *   import { projectContext } from './context/ProjectContext.js';
 *   const fullPath = projectContext.resolvePath('src/file.ts');
 */

import path from "path";

class ProjectContext {
  private projectRoot: string;

  constructor() {
    // Capture process.cwd() at initialization
    // This is the directory where the user invoked the agent
    this.projectRoot = process.cwd();
  }

  /**
   * Get the root directory of the current project
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Resolve a relative path to absolute path within the project
   * @param relativePath - Path relative to project root
   * @returns Absolute path
   */
  resolvePath(relativePath: string): string {
    // If already absolute, return as-is
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }

    // Otherwise resolve relative to project root
    return path.resolve(this.projectRoot, relativePath);
  }

  /**
   * Check if a path is within the project directory
   * (Security check to prevent path traversal attacks)
   */
  isWithinProject(absolutePath: string): boolean {
    const normalizedPath = path.normalize(absolutePath);
    const normalizedRoot = path.normalize(this.projectRoot);
    return normalizedPath.startsWith(normalizedRoot);
  }

  /**
   * Get relative path from project root
   * @param absolutePath - Absolute path
   * @returns Path relative to project root
   */
  getRelativePath(absolutePath: string): string {
    return path.relative(this.projectRoot, absolutePath);
  }

  /**
   * Set project root (for testing or manual override)
   */
  setProjectRoot(newRoot: string): void {
    this.projectRoot = newRoot;
  }
}

// Export singleton instance
export const projectContext = new ProjectContext();
