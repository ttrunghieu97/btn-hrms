import { z } from 'zod';

export const createPerformanceCycleSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên chu kỳ'),
  startsOn: z.string().min(1, 'Vui lòng chọn ngày bắt đầu'),
  endsOn: z.string().min(1, 'Vui lòng chọn ngày kết thúc'),
});

export type CreatePerformanceCycleFormValues = z.infer<typeof createPerformanceCycleSchema>;

export const createGoalSchema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tiêu đề mục tiêu'),
  description: z.string().optional(),
  employeeIds: z.array(z.string()).optional(),
});

export type CreateGoalFormValues = z.infer<typeof createGoalSchema>;
