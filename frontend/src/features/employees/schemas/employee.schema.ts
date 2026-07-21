/**
 * Employee zod schemas.
 * Expanded from legacy single-field schema to cover full DTO surface
 * exposed by EmployeesControllerCreateBody / EmployeesControllerUpdateBody
 * and EmployeeResponseDto in `@/api/generated/model`.
 */

import { z } from 'zod';
import { validationCopy } from '@/lib/feedback-copy';

const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, validationCopy.attendance.invalidDate);

export const employeeStatusSchema = z.enum([
  'working',
  'probation',
  'terminated',
  'leave',
  'suspended',
  'retired'
]);
export type EmployeeStatus = z.infer<typeof employeeStatusSchema>;

export const employeeGenderSchema = z.enum(['male', 'female', 'other']);
export type EmployeeGender = z.infer<typeof employeeGenderSchema>;

const baseEmployeeShape = {
  username: z
    .string()
    .min(1, validationCopy.auth.usernameRequired)
    .max(64, validationCopy.auth.usernameMax)
    .regex(/^[A-Za-z0-9._@-]+$/, validationCopy.auth.usernamePattern),
  email: z.string().email(validationCopy.employee.emailInvalid).optional(),
  firstName: z.string().min(1, validationCopy.employee.firstNameRequired).max(64),
  lastName: z.string().min(1, validationCopy.employee.lastNameRequired).max(64),
  employeeCode: z.string().trim().min(1, validationCopy.employee.employeeCodeRequired).max(32),
  departmentId: z.string().uuid(validationCopy.employee.departmentUuid).optional(),
  position: z.string().max(128).optional(),
  status: employeeStatusSchema.optional(),
  phoneNumber: z
    .string()
    .regex(/^[0-9+\-() ]{6,20}$/, validationCopy.employee.phoneInvalid)
    .optional(),
  address: z.string().max(255).optional(),
  gender: employeeGenderSchema.optional(),
  dob: isoDateString.optional(),
  startDate: isoDateString.optional(),
  endDate: isoDateString.optional(),
  identityNumber: z.string().max(32).optional(),
  identityDate: isoDateString.optional(),
  identityPlace: z.string().max(255).optional(),
  avatar: z.string().url().optional()
};

export const createEmployeeSchema = z.object(baseEmployeeShape);
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const createEmployeeCertificationFormSchema = z
  .object({
    name: z.string(),
    issuedBy: z.string(),
    issuedDate: z.string().optional(),
    expiredDate: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const hasAnyValue = Boolean(
      value.name.trim() ||
        value.issuedBy.trim()
    );

    if (!hasAnyValue) return;

    if (!value.name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: validationCopy.employee.certificationNameRequired,
      });
    }

    if (!value.issuedBy.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['issuedBy'],
        message: validationCopy.employee.certificationIssuerRequired,
      });
    }
  });

export const createEmployeeFormSchema = z.object({
  username: baseEmployeeShape.username,
  email: z.union([z.literal(''), z.string().email(validationCopy.employee.emailInvalid)]),
  firstName: z.string().trim().min(1, validationCopy.employee.firstNameRequired).max(64),
  lastName: z.string().trim().min(1, validationCopy.employee.lastNameRequired).max(64),
  employeeCode: z.string().trim().min(1, validationCopy.employee.employeeCodeRequired).max(32),
  departmentId: z.string().trim().min(1, validationCopy.employee.departmentRequired),
  positionId: z.string().trim().min(1, validationCopy.employee.positionRequired),
  phoneNumber: z
    .union([
      z.literal(''),
      z.string().regex(/^[0-9+\-() ]{6,20}$/, validationCopy.employee.phoneInvalid),
    ])
    .optional(),
  address: z.string().max(255).optional().or(z.literal('')),
  dob: z.union([z.literal(''), isoDateString]).optional(),
  gender: z.union([z.literal(''), employeeGenderSchema]).optional(),
  status: employeeStatusSchema.optional(),
  startDate: z.union([z.literal(''), isoDateString]).optional(),
  endDate: z.union([z.literal(''), isoDateString]).optional(),
  identityNumber: z.string().max(32).optional().or(z.literal('')),
  identityDate: z.union([z.literal(''), isoDateString]).optional(),
  identityPlace: z.string().max(255).optional().or(z.literal('')),
  certifications: z.array(createEmployeeCertificationFormSchema),
});
export const updateEmployeeFormSchema = createEmployeeFormSchema.omit({ username: true });
export type UpdateEmployeeFormInput = z.infer<typeof updateEmployeeFormSchema>;

export const updateEmployeeSchema = z.object(baseEmployeeShape).partial();
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const employeeListParamsSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  search: z.string().optional(),
  departmentId: z.string().optional(),
  status: employeeStatusSchema.optional(),
  include: z.string().optional(),
  sort: z.string().optional()
});
export type EmployeeListParams = z.infer<typeof employeeListParamsSchema>;
