import type { StatusMap } from '@/components/ui/status-badge';
import { learningUiCopy } from '@/locales/vi/app-copy';

export const COURSE_STATUS_MAP: StatusMap = {
  draft: { label: learningUiCopy.courseStatus.draft, variant: 'outline' },
  published: { label: learningUiCopy.courseStatus.published, variant: 'default' },
  archived: { label: learningUiCopy.courseStatus.archived, variant: 'secondary' },
};

export const ENROLLMENT_STATUS_MAP: StatusMap = {
  active: { label: learningUiCopy.enrollmentStatus.active, variant: 'default' },
  completed: { label: learningUiCopy.enrollmentStatus.completed, variant: 'secondary' },
  cancelled: { label: learningUiCopy.enrollmentStatus.cancelled, variant: 'outline' },
};

export const SESSION_STATUS_MAP: StatusMap = {
  scheduled: { label: learningUiCopy.sessionStatus.scheduled, variant: 'secondary' },
  in_progress: { label: learningUiCopy.sessionStatus.in_progress, variant: 'default' },
  completed: { label: learningUiCopy.sessionStatus.completed, variant: 'secondary' },
  cancelled: { label: learningUiCopy.sessionStatus.cancelled, variant: 'destructive' },
};

export const CERT_STATUS_MAP: StatusMap = {
  active: { label: learningUiCopy.certStatus.active, variant: 'default' },
  expired: { label: learningUiCopy.certStatus.expired, variant: 'destructive' },
  revoked: { label: learningUiCopy.certStatus.revoked, variant: 'outline' },
};

export const PATH_STATUS_MAP: StatusMap = {
  draft: { label: learningUiCopy.pathStatus.draft, variant: 'outline' },
  published: { label: learningUiCopy.pathStatus.published, variant: 'default' },
};

export interface CourseRow {
  id: string;
  title?: string;
  status?: string;
  estimatedHours?: number | null;
  createdAt?: string;
}

export interface SessionRow {
  id: string;
  courseId?: string;
  courseName?: string;
  title?: string;
  status?: string;
  scheduledAt?: string;
  durationMinutes?: number | null;
}

export interface CertificationRow {
  id: string;
  definitionId?: string;
  definitionName?: string;
  employeeId?: string;
  employeeName?: string;
  status?: string;
  certificateNumber?: string | null;
  issuedAt?: string;
  expiresAt?: string | null;
}

export interface LearningPathRow {
  id: string;
  name?: string;
  status?: string;
  courseCount?: number;
  createdAt?: string;
}
