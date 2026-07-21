/**
 * Cross-context port for read-only position lookups.
 *
 * Workforce and other contexts inject this port instead of importing
 * `PositionsRepository` from the scheduling domain directly.
 */
export interface PositionRecord {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  employeeCount?: number;
}

export const POSITION_READER_PORT = "POSITION_READER_PORT";

export interface PositionReaderPort {
  /** Returns an active (non-deleted) position by id, or null. */
  getActive(positionId: string): Promise<PositionRecord | null>;
  /** Returns position by id regardless of deleted status, or null. */
  findById(positionId: string): Promise<{ id: string; name: string } | null>;
  /** Returns an active position by name/title, or null. */
  findActiveByTitle(name: string): Promise<PositionRecord | null>;
  /** Returns all active positions. */
  getActivePositions(): Promise<PositionRecord[]>;
}
