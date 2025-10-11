import * as fs from "fs/promises";
import * as path from "path";

/**
 * Recursively walks a directory and returns all file and directory paths
 * @param dir - Directory to walk
 * @param baseDir - Base directory for relative paths (defaults to dir)
 * @returns Array of relative file and directory paths
 */
export async function walkDirectory(
  dir: string,
  baseDir?: string
): Promise<string[]> {
  const base = baseDir || dir;
  const items: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, dist, .git
        if (!["node_modules", "dist", ".git"].includes(entry.name)) {
          // Add the directory itself
          const relativeDirPath = path.relative(base, fullPath);
          items.push(relativeDirPath + "/"); // Add trailing slash to indicate directory

          // Recurse into subdirectories
          const subItems = await walkDirectory(fullPath, base);
          items.push(...subItems);
        }
      } else {
        // Add relative path from base directory
        const relativePath = path.relative(base, fullPath);
        items.push(relativePath);
      }
    }
  } catch (error) {
    console.error(`Error walking directory ${dir}:`, error);
  }

  return items;
}

/**
 * Gets all files and directories in the src/ directory
 * @returns Array of file and directory paths relative to project root
 */
export async function getSrcFiles(): Promise<string[]> {
  const srcPath = path.join(process.cwd(), "src");
  const items = await walkDirectory(srcPath);

  // Prepend 'src/' to each path for clarity
  return items.map((item) => `src/${item.replace(/\\/g, "/")}`);
}
