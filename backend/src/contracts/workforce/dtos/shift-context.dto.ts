export class ShiftContextDto {
  assignmentId!: string;
  shiftTemplateId?: string;
  effectiveFrom!: string;
  effectiveTo?: string | null;
  status?: string;
  scheduledMinutes?: number;
}
