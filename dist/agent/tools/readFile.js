import fs from "fs/promises";
import { existsSync } from "fs";
import nodePath from "path";
export const readFileTool = {
    name: "read_file",
    description: `Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directories.`,
    input_schema: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: `The relative path of a file in the working directory`,
            },
        },
        required: ["path"],
    },
    func: async (args) => {
        const path = args.path;
        const resolvedPath = nodePath.resolve(path);
        if (!existsSync(resolvedPath)) {
            throw new Error(`File at path ${path} does not exist.`);
        }
        try {
            return fs.readFile(resolvedPath, "utf-8");
        }
        catch (error) {
            throw new Error(error instanceof Error ? error.message : String(error));
        }
    },
};
