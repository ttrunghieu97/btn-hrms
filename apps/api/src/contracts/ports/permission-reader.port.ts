export const IPERMISSION_READER = "IPERMISSION_READER";

export interface IPermissionReader {
  getPermissions(userId: string): Promise<string[]>;
  invalidate(userId: string): Promise<void>;
}
