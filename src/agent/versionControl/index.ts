/**
 * Version Control Module
 *
 * Provides lightweight version control functionality for file edits:
 * - In-memory undo buffer (last edit per file)
 * - Show diffs for recent changes
 * - Revert capabilities
 * - No git history pollution (~50KB memory footprint)
 */

export { DiffViewer } from "./diffViewer.js";
export {
  UndoManager,
  type EditRecord,
  type UndoBuffer,
} from "./undoManager.js";
