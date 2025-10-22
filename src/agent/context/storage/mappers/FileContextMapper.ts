/**
 * FileContext Mapper
 * 
 * Converts between database rows and domain objects for file contexts.
 * Single Responsibility: Data transformation for file contexts
 */

import type { FileContext, FileContextRow } from '../../types.js';

export class FileContextMapper {
  /**
   * Convert database row to domain object
   */
  static toDomain(row: FileContextRow): FileContext {
    return {
      path: row.path,
      lastAccessed: new Date(row.last_accessed),
      accessCount: row.access_count,
      purpose: row.purpose || undefined,
      relatedFiles: [], // Loaded separately if needed
      recentEdits: [], // Loaded separately if needed
    };
  }

  /**
   * Convert domain object to database row (for inserts/updates)
   */
  static toRow(fileContext: FileContext): FileContextRow {
    return {
      path: fileContext.path,
      last_accessed: fileContext.lastAccessed.toISOString(),
      access_count: fileContext.accessCount,
      purpose: fileContext.purpose || null,
    };
  }
}
