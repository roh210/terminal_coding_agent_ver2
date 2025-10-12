import { readFileTool } from "./readFile.js";
import { listFilesTool } from "./listFiles.js";
import { editFileTool } from "./editFile.js";
import { createDirectoryTool } from "./createDirectory.js";
import { undoEditTool } from "./undoEdit.js";
import { showDiffTool } from "./showDiff.js";
import { listRecentEditsTool } from "./listRecentEdits.js";

export default [
  readFileTool,
  listFilesTool,
  editFileTool,
  createDirectoryTool,
  undoEditTool,
  showDiffTool,
  listRecentEditsTool,
];
