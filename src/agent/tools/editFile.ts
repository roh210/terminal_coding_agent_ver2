import fs from "fs/promises";
import { existsSync, readFileSync } from "fs";
import nodePath from "path";
import { ToolDefinition, EditFileInput } from "./../types.js";
import { UndoManager } from "../versionControl/index.js";

// Initialize undo manager with current working directory
const undoManager = new UndoManager(process.cwd());

export const editFileTool: ToolDefinition = {
  name: "edit_file",
  description: `Make edits to a text file. Replaces 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str MUST be different from each other. If the file specified with path doesn't exist, it will be created`,
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The relative path of a file in the working directory",
      },
      old_str: {
        type: "string",
        description: "The string to replace in the file",
      },
      new_str: {
        type: "string",
        description: "The string to replace with in the file",
      },
    },
    required: ["path", "old_str", "new_str"],
  },

  func: async (args): Promise<string> => {
    // Type guard to ensure we have the correct input type
    if (!("path" in args && "old_str" in args && "new_str" in args)) {
      throw new Error("Missing required parameters: path, old_str, new_str");
    }

    const input = args as EditFileInput;
    const path: string = input.path;
    const oldStr: string = input.old_str;
    const newStr: string = input.new_str;
    const resolvedPath = nodePath.resolve(path);

    //Validate that old_str and new_str are different
    if (oldStr === newStr) {
      throw new Error(
        `'old_str' and 'new_str' must be different from each other`
      );
    }

    try {
      let fileContent: string;
      let userIntent =
        oldStr === "" ? `Create new file: ${path}` : `Edit file: ${path}`;

      // check if file exists
      if (existsSync(resolvedPath) && oldStr !== "") {
        // read existing file content (BEFORE edit)
        fileContent = await fs.readFile(resolvedPath, "utf-8");

        // check if old_str exists in the file
        if (!fileContent.includes(oldStr)) {
          return `No changes made: String '${oldStr} ' not found in file ${path}`;
        }
        // replace all occurences of old_str with new_str
        const splitParts = fileContent.split(oldStr);
        const newContent = splitParts.join(newStr);

        // Record edit in undo buffer
        try {
          undoManager.recordEdit(
            resolvedPath,
            fileContent,
            newContent,
            userIntent
          );
          console.log(`� Undo available for ${path}`);
        } catch (error) {
          console.warn(
            "⚠️  Failed to record undo:",
            error instanceof Error ? error.message : String(error)
          );
        }

        // write the modified content back to the file
        await fs.writeFile(resolvedPath, newContent, "utf-8");

        // count replacements:
        // splitParts.length - 1 gives the number of
        // delimiters (oldStr) found

        const occurences = splitParts.length - 1;
        return `Successfully made ${occurences} replacements ${
          occurences !== 1 ? "s" : ""
        } in ${path}`;
      } else if (oldStr === "") {
        // create new file with new_str as content
        // First ensure parent directory exists
        const parentDir = nodePath.dirname(resolvedPath);
        await fs.mkdir(parentDir, { recursive: true });

        // Write the new file
        await fs.writeFile(resolvedPath, newStr, "utf-8");

        // Record in undo buffer (no "before" content for new files)
        try {
          undoManager.recordEdit(resolvedPath, "", newStr, userIntent);
          console.log(`� Undo available for ${path}`);
        } catch (error) {
          console.warn(
            "⚠️  Failed to record undo:",
            error instanceof Error ? error.message : String(error)
          );
        }

        return `File created at ${path}`;
      }
      throw new Error(`File ${path} does not exist`);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  },
};
