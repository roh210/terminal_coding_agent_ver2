import * as fs from "fs";
import * as path from "path";
import { ToolDefinition } from "../types.js";

/**
 * Creates a directory (and parent directories if needed)
 */
export const createDirectoryTool: ToolDefinition = {
  name: "create_directory",
  description:
    "Creates a new directory at the specified path. Will create parent directories if they don't exist (like mkdir -p).",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The directory path to create (relative or absolute)",
      },
    },
    required: ["path"],
  },
  func: async (args: { path: string }): Promise<string> => {
    try {
      const dirPath = path.resolve(args.path);

      // Create directory recursively
      fs.mkdirSync(dirPath, { recursive: true });

      return `Directory created successfully at: ${dirPath}`;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to create directory: ${error.message}`);
      }
      throw error;
    }
  },
};
