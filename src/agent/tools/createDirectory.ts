import * as fs from "fs";
import * as path from "path";
import { ToolDefinition, CreateDirectoryInput } from "../types.js";

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
  func: async (args): Promise<string> => {
    // Type guard to ensure we have the correct input type
    if (!("path" in args)) {
      throw new Error("Missing required parameter: path");
    }

    const input = args as CreateDirectoryInput;
    try {
      const dirPath = path.resolve(input.path);

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
