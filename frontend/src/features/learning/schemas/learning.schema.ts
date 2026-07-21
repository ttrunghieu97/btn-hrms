import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tên khóa học'),
  description: z.string().optional(),
  estimatedHours: z.coerce.number().min(0).optional(),
});
export type CreateCourseFormValues = z.infer<typeof createCourseSchema>;

export const createSessionSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1, 'Vui lòng nhập tiêu đề'),
  scheduledAt: z.string().min(1, 'Vui lòng chọn thời gian'),
  durationMinutes: z.coerce.number().min(0).optional(),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional().or(z.literal('')),
  maxAttendees: z.coerce.number().min(1).optional(),
});
export type CreateSessionFormValues = z.infer<typeof createSessionSchema>;

export const createCertDefSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên chứng chỉ'),
  description: z.string().optional(),
  issuer: z.string().optional(),
  validityMonths: z.coerce.number().min(0).optional(),
});
export type CreateCertDefFormValues = z.infer<typeof createCertDefSchema>;

export const createPathSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên lộ trình'),
  description: z.string().optional(),
  courses: z.array(z.string()).optional(),
});
export type CreatePathFormValues = z.infer<typeof createPathSchema>;
