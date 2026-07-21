export type ErrorContractDomain =
  | "auth"
  | "request"
  | "user"
  | "employee"
  | "department"
  | "position"
  | "upload"
  | "schedule"
  | "attendance"
  | "system"
  | "location"
  | "payroll"
  | "task"
  | "notification"
  | "approval"
  | "role"
  | "integration"
  | "document"
  | "leave"
  | "workflow"
  | "chat"
  | "recruitment"
  | "asset"
  | "contract"
  | "onboarding"
  | "offboarding";

export type ErrorContractKind =
  | "service-unavailable"
  | "unauthenticated"
  | "forbidden"
  | "validation"
  | "conflict"
  | "not-found"
  | "rate-limit"
  | "generic";

export type ErrorContractAction =
  | "retry"
  | "sign-in"
  | "review"
  | "reload"
  | "contact-admin"
  | "reselect-file";

export type ErrorContractApiCode =
  | "AUTH_EXPIRED"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "CONFLICT"
  | "NOT_FOUND"
  | "RATE_LIMIT"
  | "SERVER"
  | "UNKNOWN";

export type ErrorContractHttpStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 503;

export interface ErrorContractDefinition {
  code: string;
  httpStatus: ErrorContractHttpStatus;
  domain: ErrorContractDomain;
  kind: ErrorContractKind;
  apiCode: ErrorContractApiCode;
  retryable: boolean;
  action: ErrorContractAction;
}

export interface ErrorContractManifest {
  schemaVersion: 1;
  contracts: Record<string, ErrorContractDefinition>;
}

function defineContract(args: ErrorContractDefinition): ErrorContractDefinition {
  return args;
}

function unauthenticatedExpired(code: string): ErrorContractDefinition {
  return defineContract({
    code,
    httpStatus: 401,
    domain: "auth",
    kind: "unauthenticated",
    apiCode: "AUTH_EXPIRED",
    retryable: false,
    action: "sign-in",
  });
}

function unauthenticatedRequired(code: string): ErrorContractDefinition {
  return defineContract({
    code,
    httpStatus: 401,
    domain: "auth",
    kind: "unauthenticated",
    apiCode: "AUTH_REQUIRED",
    retryable: false,
    action: "sign-in",
  });
}

function forbidden(
  code: string,
  domain: ErrorContractDomain,
  action: ErrorContractAction = "contact-admin",
): ErrorContractDefinition {
  return defineContract({
    code,
    httpStatus: 403,
    domain,
    kind: "forbidden",
    apiCode: "FORBIDDEN",
    retryable: false,
    action,
  });
}

function validation(
  code: string,
  domain: ErrorContractDomain,
  action: ErrorContractAction = "review",
): ErrorContractDefinition {
  return defineContract({
    code,
    httpStatus: 400,
    domain,
    kind: "validation",
    apiCode: "VALIDATION",
    retryable: false,
    action,
  });
}

function validation422(
  code: string,
  domain: ErrorContractDomain,
  action: ErrorContractAction = "review",
): ErrorContractDefinition {
  return defineContract({
    code,
    httpStatus: 422,
    domain,
    kind: "validation",
    apiCode: "VALIDATION",
    retryable: false,
    action,
  });
}

function conflict(
  code: string,
  domain: ErrorContractDomain,
  action: ErrorContractAction = "reload",
): ErrorContractDefinition {
  return defineContract({
    code,
    httpStatus: 409,
    domain,
    kind: "conflict",
    apiCode: "CONFLICT",
    retryable: false,
    action,
  });
}

function notFound(
  code: string,
  domain: ErrorContractDomain,
): ErrorContractDefinition {
  return defineContract({
    code,
    httpStatus: 404,
    domain,
    kind: "not-found",
    apiCode: "NOT_FOUND",
    retryable: false,
    action: "reload",
  });
}

function rateLimit(
  code: string,
  domain: ErrorContractDomain,
  httpStatus: ErrorContractHttpStatus = 429,
): ErrorContractDefinition {
  return defineContract({
    code,
    httpStatus,
    domain,
    kind: "rate-limit",
    apiCode: "RATE_LIMIT",
    retryable: false,
    action: "retry",
  });
}

function serverError(
  code: string,
  httpStatus: 500 | 503,
): ErrorContractDefinition {
  return defineContract({
    code,
    httpStatus,
    domain: "system",
    kind: "service-unavailable",
    apiCode: "SERVER",
    retryable: true,
    action: "retry",
  });
}

export const ERROR_CONTRACTS = {
  APPROVAL_POLICY_EMPTY_STEPS: validation("APPROVAL_POLICY_EMPTY_STEPS", "approval"),
  APPROVAL_POLICY_NOT_FOUND: notFound("APPROVAL_POLICY_NOT_FOUND", "approval"),
  APPROVAL_REQUEST_NOT_FOUND: notFound("APPROVAL_REQUEST_NOT_FOUND", "approval"),
  APPROVAL_REQUEST_NOT_PENDING: conflict("APPROVAL_REQUEST_NOT_PENDING", "approval"),
  APPROVAL_STEP_ALREADY_DECIDED: conflict("APPROVAL_STEP_ALREADY_DECIDED", "approval"),
  APPROVAL_STEP_NOT_FOUND: notFound("APPROVAL_STEP_NOT_FOUND", "approval"),
  ASSET_DUPLICATE_CODE: conflict("ASSET_DUPLICATE_CODE", "asset", "review"),
  ASSET_INSUFFICIENT_STOCK: validation("ASSET_INSUFFICIENT_STOCK", "asset"),
  ASSET_INVALID_STATUS: conflict("ASSET_INVALID_STATUS", "asset"),
  ASSET_ISSUE_NOT_FOUND: notFound("ASSET_ISSUE_NOT_FOUND", "asset"),
  ASSET_NOT_AVAILABLE: conflict("ASSET_NOT_AVAILABLE", "asset"),
  ASSET_NOT_FOUND: notFound("ASSET_NOT_FOUND", "asset"),
  ASSET_REQUEST_INVALID_STATUS: conflict("ASSET_REQUEST_INVALID_STATUS", "asset"),
  ASSET_REQUEST_NOT_APPROVED: conflict("ASSET_REQUEST_NOT_APPROVED", "asset"),
  ASSET_REQUEST_NOT_FOUND: notFound("ASSET_REQUEST_NOT_FOUND", "asset"),
  ASSET_TYPE_NOT_FOUND: notFound("ASSET_TYPE_NOT_FOUND", "asset"),
  ASSET_VALIDATION: validation("ASSET_VALIDATION", "asset"),
  ONBOARDING_TEMPLATE_NOT_FOUND: notFound("ONBOARDING_TEMPLATE_NOT_FOUND", "onboarding"),
  ONBOARDING_PROCESS_ALREADY_EXISTS: conflict(
    "ONBOARDING_PROCESS_ALREADY_EXISTS",
    "onboarding",
    "review",
  ),
  ONBOARDING_TEMPLATE_ALREADY_EXISTS: conflict(
    "ONBOARDING_TEMPLATE_ALREADY_EXISTS",
    "onboarding",
    "review",
  ),
  ATTENDANCE_IMAGE_UPLOAD_FORBIDDEN: forbidden(
    "ATTENDANCE_IMAGE_UPLOAD_FORBIDDEN",
    "attendance",
  ),
  ATTENDANCE_ALREADY_RECORDED: conflict("ATTENDANCE_ALREADY_RECORDED", "attendance"),
  AUTH_ACCOUNT_DISABLED: unauthenticatedExpired("AUTH_ACCOUNT_DISABLED"),
  AUTH_INVALID_CREDENTIALS: unauthenticatedExpired("AUTH_INVALID_CREDENTIALS"),
  AUTH_REFRESH_INVALID: unauthenticatedExpired("AUTH_REFRESH_INVALID"),
  AUTH_TOKEN_INVALID: unauthenticatedExpired("AUTH_TOKEN_INVALID"),
  AUTH_TOKEN_MISSING: unauthenticatedRequired("AUTH_TOKEN_MISSING"),
  AUTH_TOKEN_OUTDATED: unauthenticatedExpired("AUTH_TOKEN_OUTDATED"),
  CHAT_CONVERSATION_NOT_FOUND: notFound("CHAT_CONVERSATION_NOT_FOUND", "chat"),
  CONTRACT_NOT_FOUND: notFound("CONTRACT_NOT_FOUND", "contract"),
  CHAT_INVALID_PARTICIPANT_COUNT: validation(
    "CHAT_INVALID_PARTICIPANT_COUNT",
    "chat",
  ),
  CHAT_MESSAGE_NOT_FOUND: notFound("CHAT_MESSAGE_NOT_FOUND", "chat"),
  CHAT_NOT_PARTICIPANT: forbidden("CHAT_NOT_PARTICIPANT", "chat"),
  CONFLICT: conflict("CONFLICT", "request"),
  DEPARTMENT_ALREADY_EXISTS: conflict("DEPARTMENT_ALREADY_EXISTS", "department", "review"),
  DEPARTMENT_NOT_FOUND: notFound("DEPARTMENT_NOT_FOUND", "department"),
  DOCUMENT_NOT_FOUND: notFound("DOCUMENT_NOT_FOUND", "document"),
  EMAIL_ALREADY_EXISTS: conflict("EMAIL_ALREADY_EXISTS", "user", "review"),
  EMPLOYEE_ALREADY_TERMINATED: conflict("EMPLOYEE_ALREADY_TERMINATED", "employee"),
  EMPLOYEE_CODE_ALREADY_EXISTS: conflict(
    "EMPLOYEE_CODE_ALREADY_EXISTS",
    "employee",
    "review",
  ),
  EMPLOYEE_NOT_FOUND: notFound("EMPLOYEE_NOT_FOUND", "employee"),
  EMPLOYEE_PROFILE_NOT_FOUND: notFound("EMPLOYEE_PROFILE_NOT_FOUND", "employee"),
  EMPLOYEE_PROFILE_REQUIRED: validation("EMPLOYEE_PROFILE_REQUIRED", "employee"),
  FILE_REQUIRED: validation422("FILE_REQUIRED", "upload"),
  FILE_TOKEN_EXPIRED: validation422("FILE_TOKEN_EXPIRED", "upload", "reselect-file"),
  FILE_TOKEN_NOT_FOUND: validation422("FILE_TOKEN_NOT_FOUND", "upload", "reselect-file"),
  FORBIDDEN: forbidden("FORBIDDEN", "auth"),
  GEOFENCE_VIOLATION: validation("GEOFENCE_VIOLATION", "attendance"),
  IDEMPOTENCY_CONFLICT: conflict("IDEMPOTENCY_CONFLICT", "workflow"),
  IDEMPOTENCY_IN_PROGRESS: rateLimit("IDEMPOTENCY_IN_PROGRESS", "workflow", 409),
  INTERNAL_ERROR: serverError("INTERNAL_ERROR", 500),
  INVALID_REQUEST: validation("INVALID_REQUEST", "request"),
  INVALID_STATUS_TRANSITION: conflict("INVALID_STATUS_TRANSITION", "workflow"),
  INVALID_UPDATE_PAYLOAD: validation("INVALID_UPDATE_PAYLOAD", "request"),
  IP_NOT_WHITELISTED: forbidden("IP_NOT_WHITELISTED", "attendance"),
  LEAVE_APPROVER_REQUIRED: validation("LEAVE_APPROVER_REQUIRED", "leave"),
  LEAVE_BALANCE_INSUFFICIENT: validation("LEAVE_BALANCE_INSUFFICIENT", "leave"),
  LEAVE_BALANCE_NOT_FOUND: notFound("LEAVE_BALANCE_NOT_FOUND", "leave"),
  LEAVE_PARTIAL_DAY_INVALID: validation("LEAVE_PARTIAL_DAY_INVALID", "leave"),
  LEAVE_POLICY_INELIGIBLE: validation("LEAVE_POLICY_INELIGIBLE", "leave"),
  LEAVE_POLICY_OVERLAP: conflict("LEAVE_POLICY_OVERLAP", "leave", "review"),
  LEAVE_SELF_APPROVAL_FORBIDDEN: validation(
    "LEAVE_SELF_APPROVAL_FORBIDDEN",
    "leave",
  ),
  LOCATION_ALREADY_EXISTS: conflict("LOCATION_ALREADY_EXISTS", "location", "review"),
  LOCATION_INVALID_HIERARCHY: validation("LOCATION_INVALID_HIERARCHY", "location"),
  LOCATION_NOT_FOUND: notFound("LOCATION_NOT_FOUND", "location"),
  LOCATION_TYPE_NOT_ASSIGNABLE: validation(
    "LOCATION_TYPE_NOT_ASSIGNABLE",
    "location",
  ),
  NOTE_REQUIRED: validation("NOTE_REQUIRED", "request"),
  NO_SHIFT_ASSIGNED: validation("NO_SHIFT_ASSIGNED", "attendance"),
  NOTIFICATION_BODY_REQUIRED: validation("NOTIFICATION_BODY_REQUIRED", "notification"),
  NOTIFICATION_TEMPLATE_ALREADY_EXISTS: conflict(
    "NOTIFICATION_TEMPLATE_ALREADY_EXISTS",
    "notification",
    "review",
  ),
  NOTIFICATION_TEMPLATE_NOT_FOUND: notFound(
    "NOTIFICATION_TEMPLATE_NOT_FOUND",
    "notification",
  ),
  NOT_FOUND: notFound("NOT_FOUND", "request"),
  OUTSIDE_WORK_AREA: validation("OUTSIDE_WORK_AREA", "attendance"),
  PAYROLL_NOT_FOUND: notFound("PAYROLL_NOT_FOUND", "payroll"),
  PERMISSION_DENIED: forbidden("PERMISSION_DENIED", "auth"),
  POSITION_NOT_FOUND: notFound("POSITION_NOT_FOUND", "position"),
  POSITION_TITLE_ALREADY_EXISTS: conflict(
    "POSITION_TITLE_ALREADY_EXISTS",
    "position",
    "review",
  ),
  RATE_LIMITED: rateLimit("RATE_LIMITED", "system"),
  RECRUITMENT_APPLICATION_DUPLICATE: conflict(
    "RECRUITMENT_APPLICATION_DUPLICATE",
    "recruitment",
    "review",
  ),
  RECRUITMENT_APPLICATION_NOT_FOUND: notFound(
    "RECRUITMENT_APPLICATION_NOT_FOUND",
    "recruitment",
  ),
  RECRUITMENT_INVALID_STAGE: conflict(
    "RECRUITMENT_INVALID_STAGE",
    "recruitment",
  ),
  RECRUITMENT_INVALID_STAGE_TRANSITION: conflict(
    "RECRUITMENT_INVALID_STAGE_TRANSITION",
    "recruitment",
  ),
  RECRUITMENT_INVALID_STATUS: conflict(
    "RECRUITMENT_INVALID_STATUS",
    "recruitment",
  ),
  RECRUITMENT_OFFER_NOT_FOUND: notFound(
    "RECRUITMENT_OFFER_NOT_FOUND",
    "recruitment",
  ),
  RECRUITMENT_POSTING_NOT_FOUND: notFound(
    "RECRUITMENT_POSTING_NOT_FOUND",
    "recruitment",
  ),
  RECRUITMENT_POSTING_NOT_OPEN: conflict(
    "RECRUITMENT_POSTING_NOT_OPEN",
    "recruitment",
  ),
  RECRUITMENT_REQUISITION_NOT_APPROVED: conflict(
    "RECRUITMENT_REQUISITION_NOT_APPROVED",
    "recruitment",
  ),
  RECRUITMENT_REQUISITION_NOT_FOUND: notFound(
    "RECRUITMENT_REQUISITION_NOT_FOUND",
    "recruitment",
  ),
  RECRUITMENT_SCORECARD_STAGE_INVALID: conflict(
    "RECRUITMENT_SCORECARD_STAGE_INVALID",
    "recruitment",
  ),
  RECRUITMENT_VALIDATION: validation("RECRUITMENT_VALIDATION", "recruitment"),
  ROLE_ALREADY_EXISTS: conflict("ROLE_ALREADY_EXISTS", "role", "review"),
  ROLE_CODE_ALREADY_EXISTS: conflict("ROLE_CODE_ALREADY_EXISTS", "role", "review"),
  ROLE_CODE_IMMUTABLE: validation("ROLE_CODE_IMMUTABLE", "role"),
  ROLE_IN_USE: conflict("ROLE_IN_USE", "role"),
  ROLE_NOT_FOUND: notFound("ROLE_NOT_FOUND", "role"),
  ROLE_SYSTEM_PROTECTED: forbidden("ROLE_SYSTEM_PROTECTED", "role"),
  SCHEDULE_CONFLICT: conflict("SCHEDULE_CONFLICT", "schedule", "review"),
  SCHEDULE_LOCKED: conflict("SCHEDULE_LOCKED", "schedule"),
  SCHEDULE_NOT_FOUND: notFound("SCHEDULE_NOT_FOUND", "schedule"),
  SELFIE_MISSING: validation("SELFIE_MISSING", "attendance"),
  SELFIE_REJECTED: validation("SELFIE_REJECTED", "attendance"),
  SERVICE_UNAVAILABLE: serverError("SERVICE_UNAVAILABLE", 503),
  SHIFT_CANCEL_BEFORE_START: validation("SHIFT_CANCEL_BEFORE_START", "schedule"),
  SHIFT_TEMPLATE_ALREADY_ARCHIVED: conflict(
    "SHIFT_TEMPLATE_ALREADY_ARCHIVED",
    "schedule",
  ),
  SHIFT_TEMPLATE_CREATE_FAILED: validation("SHIFT_TEMPLATE_CREATE_FAILED", "schedule"),
  SHIFT_TEMPLATE_INACTIVE: validation("SHIFT_TEMPLATE_INACTIVE", "schedule"),
  SHIFT_TIME_IDENTICAL: validation("SHIFT_TIME_IDENTICAL", "schedule"),
  SHIFT_TIME_INVALID_ORDER: validation("SHIFT_TIME_INVALID_ORDER", "schedule"),
  TASK_BLOCKED_BY_DEPENDENCIES: validation("TASK_BLOCKED_BY_DEPENDENCIES", "task"),
  TASK_CONFLICT: conflict("TASK_CONFLICT", "task"),
  TASK_DEPENDENCY_CIRCULAR: validation("TASK_DEPENDENCY_CIRCULAR", "task"),
  TASK_DEPENDENCY_NOT_FOUND: notFound("TASK_DEPENDENCY_NOT_FOUND", "task"),
  TASK_DEPENDENCY_SELF_REF: validation("TASK_DEPENDENCY_SELF_REF", "task"),
  TASK_NOT_FOUND: notFound("TASK_NOT_FOUND", "task"),
  TASK_REVISION_LIMIT_REACHED: validation("TASK_REVISION_LIMIT_REACHED", "task"),
  TASK_TEMPLATE_NOT_FOUND: notFound("TASK_TEMPLATE_NOT_FOUND", "task"),
  UNAUTHORIZED: unauthenticatedRequired("UNAUTHORIZED"),
  UNPROCESSABLE_ENTITY: validation422("UNPROCESSABLE_ENTITY", "request"),
  USERNAME_ALREADY_EXISTS: conflict("USERNAME_ALREADY_EXISTS", "user", "review"),
  USER_NOT_AUTHENTICATED: unauthenticatedRequired("USER_NOT_AUTHENTICATED"),
  USER_NOT_FOUND: notFound("USER_NOT_FOUND", "user"),
  VALIDATION_ERROR: validation("VALIDATION_ERROR", "request"),
  WEBHOOK_SUBSCRIPTION_NOT_FOUND: notFound(
    "WEBHOOK_SUBSCRIPTION_NOT_FOUND",
    "integration",
  ),
  WORKFLOW_ACTION_FAILED: validation("WORKFLOW_ACTION_FAILED", "workflow"),
  // ─── Offboarding ──────────────────────────────────────────
  OFFBOARDING_CLEARANCE_ALREADY_DECIDED: conflict(
    "OFFBOARDING_CLEARANCE_ALREADY_DECIDED",
    "offboarding",
  ),
  OFFBOARDING_CLEARANCE_NOT_FOUND: notFound("OFFBOARDING_CLEARANCE_NOT_FOUND", "offboarding"),
  OFFBOARDING_COMPLETION_BLOCKED: validation("OFFBOARDING_COMPLETION_BLOCKED", "offboarding"),
  OFFBOARDING_EXIT_INTERVIEW_ALREADY_EXISTS: conflict(
    "OFFBOARDING_EXIT_INTERVIEW_ALREADY_EXISTS",
    "offboarding",
  ),
  OFFBOARDING_PROCESS_ALREADY_EXISTS: conflict(
    "OFFBOARDING_PROCESS_ALREADY_EXISTS",
    "offboarding",
  ),
  OFFBOARDING_PROCESS_NOT_FOUND: notFound("OFFBOARDING_PROCESS_NOT_FOUND", "offboarding"),
  OFFBOARDING_REJECT_REQUIRES_NOTE: validation("OFFBOARDING_REJECT_REQUIRES_NOTE", "offboarding"),
  OFFBOARDING_SETTLEMENT_ALREADY_EXISTS: conflict(
    "OFFBOARDING_SETTLEMENT_ALREADY_EXISTS",
    "offboarding",
  ),

  ALLOWANCE_NOT_FOUND: notFound("ALLOWANCE_NOT_FOUND", "employee"),
  ALLOWANCE_INVALID_TYPE: validation("ALLOWANCE_INVALID_TYPE", "employee"),
  SOCIAL_INSURANCE_NOT_FOUND: notFound("SOCIAL_INSURANCE_NOT_FOUND", "employee"),
  SOCIAL_INSURANCE_CONFLICT: conflict("SOCIAL_INSURANCE_CONFLICT", "employee"),

} as const satisfies Record<string, ErrorContractDefinition>;

export type ErrorCode = keyof typeof ERROR_CONTRACTS;

export const ERROR_CODES = Object.freeze(
  Object.fromEntries(
    (Object.keys(ERROR_CONTRACTS) as ErrorCode[]).map((code) => [code, code]),
  ) as { [K in ErrorCode]: K },
);

export function getErrorContract(code: string): ErrorContractDefinition | undefined {
  return ERROR_CONTRACTS[code as ErrorCode];
}

export function createErrorContractManifest(): ErrorContractManifest {
  const contracts = {} as Record<ErrorCode, ErrorContractDefinition>;

  for (const code of (Object.keys(ERROR_CONTRACTS) as ErrorCode[]).sort()) {
    contracts[code] = ERROR_CONTRACTS[code];
  }

  return {
    schemaVersion: 1,
    contracts,
  };
}
