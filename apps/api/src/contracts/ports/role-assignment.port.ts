/**
 * Cross-context port for assigning default roles to users.
 *
 * Workforce (and other bounded contexts that create users) injects this port
 * instead of importing identity use-cases directly.
 */
export const ROLE_ASSIGNMENT_PORT = "ROLE_ASSIGNMENT_PORT";

export interface RoleAssignmentPort {
  /**
   * Assign the default employee role to a user.
   * Returns roleId and roleName of the assigned role.
   */
  assignDefaultRole(userId: string): Promise<{ roleId: string; roleName: string }>;
}
