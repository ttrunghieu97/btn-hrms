import { z } from 'zod';

const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (val) =>
      val === '' || val === null || val === undefined
        ? undefined
        : typeof val === 'string'
          ? Number(val)
          : val,
    schema.optional(),
  );

export const createCourseSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tên khóa học'),
  description: z.string().optional(),
  estimatedHours: optionalNumber(z.number().min(0)),
});
export type CreateCourseFormValues = z.infer<typeof createCourseSchema>;

export const createSessionSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1, 'Vui lòng nhập tiêu đề'),
  scheduledAt: z.string().min(1, 'Vui lòng chọn thời gian'),
  durationMinutes: optionalNumber(z.number().int().min(1)),
  location: z.string().optional(),
  meetingUrl: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().url().optional(),
  ),
  maxAttendees: optionalNumber(z.number().int().min(1)),
});
export type CreateSessionFormValues = z.infer<typeof createSessionSchema>;

export const createCertDefSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên chứng chỉ'),
  description: z.string().optional(),
  issuer: z.string().optional(),
  validityMonths: optionalNumber(z.number().int().min(1)),
});
export type CreateCertDefFormValues = z.infer<typeof createCertDefSchema>;

export const createPathSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên lộ trình'),
  description: z.string().optional(),
  courses: z.array(z.string().uuid()).optional(),
});
export type CreatePathFormValues = z.infer<typeof createPathSchema>;

