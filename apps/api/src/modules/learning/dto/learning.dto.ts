export class CreateCourseDto {
  title!: string; description?: string; estimatedHours?: number;
}
export class AssignCourseDto {
  courseId!: string; employeeIds!: string[]; dueDate?: string;
}
export class CourseResponseDto {
  id!: string; title!: string; status!: string; estimatedHours?: number | null;
}
export class EnrollmentResponseDto {
  id!: string; courseId!: string; employeeId!: string; status!: string; progressPercent!: number;
}

export class CreateSessionDto {
  courseId!: string; title!: string; scheduledAt!: string;
  durationMinutes?: number; location?: string; meetingUrl?: string; maxAttendees?: number;
}
export class SessionResponseDto {
  id!: string; courseId!: string; title!: string; status!: string;
  scheduledAt!: Date; durationMinutes?: number | null;
}

export class CreateCertificationDefDto {
  name!: string; description?: string; issuer?: string; validityMonths?: number;
}
export class IssueCertificateDto {
  definitionId!: string; employeeId!: string; courseId?: string;
}
export class CertResponseDto {
  id!: string; definitionId!: string; employeeId!: string; status!: string;
  certificateNumber?: string | null; issuedAt!: Date; expiresAt?: Date | null;
}

export class CreatePathDto { name!: string; description?: string; courses?: string[]; }
export class AssignPathDto { pathId!: string; employeeIds!: string[]; }
export class PathResponseDto {
  id!: string; name!: string; status!: string;
}
