import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "../../../../infrastructure/database/schema";

export interface EmployeeWithRelations {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  avatar?: string | null;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  departmentId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  identityNumber?: string | null;
  identityDate?: string | null;
  identityPlace?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  taxCode?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; username: string; email?: string | null } | null;
  avatarFile?: {
    id: string;
    key: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
  } | null;
  certifications?: {
    id: string;
    name: string;
    issuedBy: string;
    issuedDate: Date | string;
    expiredDate?: Date | string | null;
    image?: string | null;
    attachmentId?: string | null;
    file?: {
      id: string;
      key: string;
      mimeType?: string | null;
      sizeBytes?: number | null;
    } | null;
  }[];
  documents?: {
    id: string;
    attachmentId: string;
    documentType: string;
    createdAt: Date | string;
    isActive: boolean;
    file?: {
      id: string;
      key: string;
      mimeType?: string | null;
      sizeBytes?: number | null;
    } | null;
  }[];
  employmentRecords?: {
    id: string;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean;
  }[];
  contracts?: {
    id: string;
    contractType?: string | null;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    status?: string | null;
    isCurrent?: boolean;
  }[];
  orgAssignments?: {
    id: string;
    jobTitle?: string | null;
    department?: { id: string; name: string } | null;
    isCurrent?: boolean;
  }[];
  siteAssignments?: {
    id: string;
    isActive: boolean;
    location?: { id: string; name: string; type: string };
  }[];
}
export type Tx = PostgresJsDatabase<typeof schema>;