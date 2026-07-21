export interface WorkforceTimeManagementPort {
  getEmployeeContext(employeeId: string): Promise<{
    employeeId: string;
    userId: string;
    departmentId: string | null;
    employmentStatus: string;
    currentSite?: {
      id: string;
      latitude: string | null;
      longitude: string | null;
      radiusMeters: number | null;
      /**
       * CIDR allow-list for punch source IPs.
       * Empty array or null = no IP restriction.
       */
      allowedIpCidrs: string[] | null;
    } | null;
    currentSiteId?: string | null;
  } | null>;
}
