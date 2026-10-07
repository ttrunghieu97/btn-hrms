import { pgEnum } from "drizzle-orm/pg-core";

export const requisitionStatusEnum = pgEnum("requisition_status_enum", [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "closed",
]);

export const postingStatusEnum = pgEnum("posting_status_enum", [
  "open",
  "paused",
  "closed",
]);

export const applicationStageEnum = pgEnum("application_stage_enum", [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
]);

export const offerStatusEnum = pgEnum("offer_status_enum", [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "accepted",
  "declined",
]);

export const recruitmentApprovalSubjectEnum = pgEnum(
  "recruitment_approval_subject_enum",
  ["requisition", "offer"],
);

export const interviewTypeEnum = pgEnum("interview_type_enum", [
  "phone", "video", "in_person", "technical", "panel",
]);

export const interviewStatusEnum = pgEnum("interview_status_enum", [
  "scheduled", "completed", "cancelled", "rescheduled",
]);
