import fs from "fs/promises";
import { existsSync } from "fs";
import nodePath from "path";
import { ToolDefinition, ListFilesInput } from "../types.js";
import { projectContext } from "../context/ProjectContext.js";

export const listFilesTool: ToolDefinition = {
  name: "list_files",
  description: `List files and directories at a given path. If no path is provided, lists files in the current directory.`,
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: `Optional relative path to list files from. Defaults to current directory if not provided`,
      },
    },
    required: [],
  },
  func: async (args): Promise<string> => {
    // ListFilesInput allows path to be optional
    const input = args as ListFilesInput;
    const path: string = input.path ?? ".";

    // Use projectContext to resolve path relative to where agent was invoked
    const rPath = projectContext.resolvePath(path);

    //Check if path exists and is a directory
    if (!existsSync(rPath)) {
      throw new Error(`Directory not found : ${path}`);
    }
    const stat = await fs.stat(rPath);
    if (!stat.isDirectory()) {
      throw new Error(`${path} is not a directory`);
    }
    try {
      const dir = await fs.readdir(rPath);
      const entriesWithDirectoryMarkers = await Promise.all(
        dir.map(async (entry) => {
          const fullPath = nodePath.join(rPath, entry);
          try {
            const stats = await fs.stat(fullPath);
            return stats.isDirectory() ? `${entry}/` : entry;
          } catch (error) {
            return entry;
          }
        })
      );
      return JSON.stringify(entriesWithDirectoryMarkers);
    } catch (error) {
      throw new Error(
        `Error reading dir : ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};
