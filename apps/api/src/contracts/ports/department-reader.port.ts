/**
 * Cross-context port for read-only department lookups.
 *
 * Workforce and other contexts inject this port instead of importing
 * `DepartmentsRepository` from the organization domain directly.
 */
export const DEPARTMENT_READER_PORT = "DEPARTMENT_READER_PORT";

export interface DepartmentNode {
  id: string;
  name: string;
  parentId: string | null;
  children: DepartmentNode[];
}

export interface DepartmentReaderPort {
  /** Returns the full department hierarchy tree. */
  getTree(): Promise<DepartmentNode[]>;
  /** Returns a department by id, or null. */
  findById(id: string): Promise<{ id: string; name: string } | null>;
}
