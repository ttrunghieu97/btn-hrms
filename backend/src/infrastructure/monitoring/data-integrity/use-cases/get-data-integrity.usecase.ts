import { Injectable } from "@nestjs/common";
import { ContextLogger } from "../../../../shared/logging/context-logger";
import { RequestContextService } from "../../../../shared/context/request-context.service";
import type { DataIntegrityResponseDto, IntegrityIssueDto } from "../dto/data-integrity-response.dto";
import { DataIntegrityRepository } from "../repositories/data-integrity.repository";

@Injectable()
export class GetDataIntegrityUseCase {
  private readonly logger: ContextLogger;

  constructor(
    private readonly dataIntegrityRepo: DataIntegrityRepository,
    private readonly requestContext: RequestContextService,
  ) {
    this.logger = new ContextLogger(this.requestContext, GetDataIntegrityUseCase.name);
  }

  async execute(): Promise<DataIntegrityResponseDto> {
    const issues: IntegrityIssueDto[] = [];

    await this.runCheck(
      "checkEmployeesWithoutDepartment",
      () => this.checkEmployeesWithoutDepartment(),
      issues,
    );
    await this.runCheck(
      "checkEmployeesWithoutUser",
      () => this.checkEmployeesWithoutUser(),
      issues,
    );
    await this.runCheck(
      "checkOrphanAttendances",
      () => this.checkOrphanAttendances(),
      issues,
    );
    await this.runCheck(
      "checkStalledTasks",
      () => this.checkStalledTasks(),
      issues,
    );
    await this.runCheck(
      "checkOrphanLeaveRequests",
      () => this.checkOrphanLeaveRequests(),
      issues,
    );
    await this.runCheck(
      "checkDuplicateEmployeeCodes",
      () => this.checkDuplicateEmployeeCodes(),
      issues,
    );

    const criticalCount = issues.filter((i) => i.severity === "critical").length;

    return {
      issues,
      totalIssues: issues.length,
      criticalCount,
      checkedAt: new Date().toISOString(),
    };
  }

  private async runCheck(
    name: string,
    check: () => Promise<IntegrityIssueDto | null>,
    issues: IntegrityIssueDto[],
  ): Promise<void> {
    try {
      const issue = await check();
      if (issue) issues.push(issue);
    } catch (error: unknown) {
      this.logger.error(name, this.errorDetails(error));
    }
  }

  private errorDetails(error: unknown) {
    if (!(error instanceof Error)) {
      return { msg: String(error) };
    }

    const code =
      "code" in error && typeof error.code === "string"
        ? error.code
        : undefined;
    return {
      msg: error.message,
      code,
      stack: error.stack?.split("\n").slice(0, 3).join("; "),
    };
  }

  private async checkEmployeesWithoutDepartment(): Promise<IntegrityIssueDto | null> {
    const cnt = await this.dataIntegrityRepo.countEmployeesWithoutDepartment();

    if (cnt === 0) return null;

    return {
      domain: "employee",
      check: "employees_without_department",
      description: "Active employees without department assignment",
      severity: "critical",
      count: Number(cnt),
      recommendation: "Assign each active employee to a department",
    };
  }

  private async checkEmployeesWithoutUser(): Promise<IntegrityIssueDto | null> {
    const cnt = await this.dataIntegrityRepo.countEmployeesWithoutUser();

    if (cnt === 0) return null;

    return {
      domain: "employee",
      check: "employees_without_user",
      description: "Employees without linked user account",
      severity: "critical",
      count: Number(cnt),
      recommendation: "Create user accounts for employee records",
    };
  }

  private async checkOrphanAttendances(): Promise<IntegrityIssueDto | null> {
    const cnt = await this.dataIntegrityRepo.countOrphanAttendances();

    if (cnt === 0) return null;

    return {
      domain: "attendance",
      check: "orphan_attendance_records",
      description: "Attendance records referencing deleted employees",
      severity: "warning",
      count: Number(cnt),
      recommendation: "Clean up orphan attendance records or restore employee data",
    };
  }

  private async checkStalledTasks(): Promise<IntegrityIssueDto | null> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const cnt = await this.dataIntegrityRepo.countStalledTasks(sevenDaysAgo);

    if (cnt === 0) return null;

    return {
      domain: "task",
      check: "stalled_tasks",
      description: "Tasks not updated in 7+ days (not completed/cancelled)",
      severity: "warning",
      count: Number(cnt),
      recommendation: "Review and reassign stalled tasks",
    };
  }

  private async checkOrphanLeaveRequests(): Promise<IntegrityIssueDto | null> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cnt = await this.dataIntegrityRepo.countStaleLeaveRequests(thirtyDaysAgo);

    if (cnt === 0) return null;

    return {
      domain: "leave",
      check: "stale_leave_requests",
      description: "Leave requests pending for 30+ days",
      severity: "warning",
      count: Number(cnt),
      recommendation: "Review and process stale leave requests",
    };
  }

  private async checkDuplicateEmployeeCodes(): Promise<IntegrityIssueDto | null> {
    const cnt = await this.dataIntegrityRepo.countDuplicateEmployeeCodes();

    if (cnt === 0) return null;

    return {
      domain: "employee",
      check: "duplicate_employee_codes",
      description: "Duplicate employee codes found (soft-deleted conflicts)",
      severity: "info",
      count: Number(cnt),
      recommendation: "Ensure employee codes are unique; resolve conflicts",
    };
  }
}
