import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";
import { ToolDefinition, CreateDirectoryInput } from "../types.js";
import { projectContext } from "../context/ProjectContext.js";

/**
 * Creates a directory or file (intelligently detects based on path)
 * - If path has an extension (.js, .ts, .txt, etc), creates a file
 * - If content is provided, creates a file
 * - Otherwise, creates a directory
 */
export const createDirectoryTool: ToolDefinition = {
  name: "create_directory",
  description:
    "Create a new file or directory. If path has a file extension (.js, .ts, .txt, etc) or content is provided, creates a file. Otherwise creates a directory. Will create parent directories if they don't exist.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "Path to create. For files, include extension (e.g., 'file.js', 'src/utils.ts'). For directories, omit extension (e.g., 'src/', 'components').",
      },
      content: {
        type: "string",
        description:
          "Optional content to write if creating a file. Creates empty file if omitted but path has extension.",
      },
    },
    required: ["path"],
  },
  func: async (args): Promise<string> => {
    // Type guard to ensure we have the correct input type
    if (!("path" in args)) {
      throw new Error("Missing required parameter: path");
    }

    const input = args as CreateDirectoryInput & { content?: string };

    try {
      // Use projectContext to resolve path relative to where agent was invoked
      const resolvedPath = projectContext.resolvePath(input.path);

      // Determine if this is a file or directory
      const hasExtension = path.extname(resolvedPath) !== "";
      const hasContent = input.content !== undefined;
      const isFile = hasExtension || hasContent;

      if (isFile) {
        // Create file
        const parentDir = path.dirname(resolvedPath);

        // Create parent directories first
        await fsPromises.mkdir(parentDir, { recursive: true });

        // Create file with content (or empty if no content)
        const fileContent = input.content || "";
        await fsPromises.writeFile(resolvedPath, fileContent, "utf-8");

        const lines = fileContent.split("\n").length;
        return `File created: ${input.path} (${lines} line${
          lines !== 1 ? "s" : ""
        })`;
      } else {
        // Create directory
        fs.mkdirSync(resolvedPath, { recursive: true });
        return `Directory created: ${input.path}`;
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to create: ${error.message}`);
      }
      throw error;
    }
  },
};
