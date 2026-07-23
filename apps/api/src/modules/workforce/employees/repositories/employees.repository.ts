export * from "./employee-repository.types";
import { todayDateString } from "../../../../shared/utils/date-format";
export { EmployeeReadRepository } from "./employee-read.repository";
export { EmployeeWriteRepository } from "./employee-write.repository";
export { EmployeeQueryBuilder } from "./employee-query-builder";

import * as schema from "../../../../infrastructure/database/schema";
import { Injectable, Inject } from "@nestjs/common";
import { DATABASE_CONNECTION } from "../../../../infrastructure/database/database.provider";
import type { EmployeeWithRelations, Tx } from "./employee-repository.types";
import { BaseRepository } from "../../../../infrastructure/repositories/base.repository";
import { EmployeeReadRepository } from "./employee-read.repository";
import { EmployeeWriteRepository } from "./employee-write.repository";
import type { EmployeeQueryDto } from "../dto/employee-query.dto";
import type { DataScope } from "../../../../core/security/types/data-scope.interface";
import type { SQL } from "drizzle-orm";
import { EmployeeEncryption } from "./employee-encryption";

@Injectable()
export class EmployeesRepository extends BaseRepository<
  typeof schema.employees.$inferSelect,
  typeof schema.employees.$inferInsert,
  Partial<typeof schema.employees.$inferInsert>
> {
  private readonly readRepo: EmployeeReadRepository;
  private readonly writeRepo: EmployeeWriteRepository;

  constructor(
    @Inject(DATABASE_CONNECTION)
    db: Tx,
  ) {
    super();
    const encryption = new EmployeeEncryption();
    this.readRepo = new EmployeeReadRepository(db, encryption);
    this.writeRepo = new EmployeeWriteRepository(db, encryption);
  }

  // -- BaseRepository abstract methods ------------------------------

  async findById(id: string): Promise<any> {
    return this.readRepo.findById(id);
  }

  async findMany(options?: any) {
    return this.readRepo.findMany(options);
  }

  async create(
    data: typeof schema.employees.$inferInsert,
  ): Promise<typeof schema.employees.$inferSelect> {
    return this.writeRepo.create(data);
  }

  async update(
    id: string,
    data: Partial<typeof schema.employees.$inferInsert>,
  ): Promise<typeof schema.employees.$inferSelect> {
    return this.writeRepo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.writeRepo.delete(id);
  }

  // -- Read delegates -----------------------------------------------

  findManyRaw(options: Parameters<Tx["query"]["employees"]["findMany"]>[0]) {
    return this.readRepo.findManyRaw(options);
  }

  async count(where?: SQL) {
    return this.readRepo.count(where);
  }

  async countActiveByPositions() {
    return this.readRepo.countActiveByPositions();
  }

  async countActiveByDepartments() {
    return this.readRepo.countActiveByDepartments();
  }

  async findPaginated(
    query: EmployeeQueryDto,
    scope?: DataScope,
  ): Promise<{
    rows: EmployeeWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.readRepo.findPaginated(query, scope);
  }

  async findByIdentifier(identifier: string, query?: EmployeeQueryDto) {
    return this.readRepo.findByIdentifier(identifier, query);
  }

  findUserIdByUsername(username: string, db?: Tx) {
    return this.readRepo.findUserIdByUsername(username, db);
  }

  findUserIdByUserId(userId: string, db?: Tx) {
    return this.readRepo.findUserIdByUserId(userId, db);
  }

  findFirstEmployee(
    options: Parameters<Tx["query"]["employees"]["findFirst"]>[0],
  ) {
    return this.readRepo.findFirstEmployee(options);
  }

  findEmployeeByUserId(userId: string) {
    return this.readRepo.findEmployeeByUserId(userId);
  }

  findEmployeeById(employeeId: string) {
    return this.readRepo.findEmployeeById(employeeId);
  }

  findDeletedEmployeeByUserId(userId: string) {
    return this.readRepo.findDeletedEmployeeByUserId(userId);
  }

  findDeletedEmployeeById(employeeId: string) {
    return this.readRepo.findDeletedEmployeeById(employeeId);
  }

  findCurrentEmploymentRecord(employeeId: string, db?: Tx) {
    return this.readRepo.findCurrentEmploymentRecord(employeeId, db);
  }

  findCurrentEmployeeContract(employeeId: string, db?: Tx) {
    return this.readRepo.findCurrentEmployeeContract(employeeId, db);
  }

  findCurrentOrgAssignment(employeeId: string, db?: Tx) {
    return this.readRepo.findCurrentOrgAssignment(employeeId, db);
  }

  async findEmployeeUserContextByIdentifier(
    identifier: string,
    db?: Tx,
  ) {
    return this.readRepo.findEmployeeUserContextByIdentifier(identifier, db);
  }

  async userExistsByUsername(username: string) {
    return this.readRepo.userExistsByUsername(username);
  }

  async checkCodeExists(employeeCode: string): Promise<boolean> {
    return this.readRepo.checkCodeExists(employeeCode);
  }

  // -- Write delegates ----------------------------------------------

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.writeRepo.transaction(fn);
  }

  async restoreEmployee(employeeId: string, tx: Tx) {
    return this.writeRepo.restoreEmployee(employeeId, tx);
  }

  async hardDeleteEmployee(employeeId: string, tx: Tx) {
    return this.writeRepo.hardDeleteEmployee(employeeId, tx);
  }

  updateUserById(
    userId: string,
    values: Partial<typeof schema.users.$inferInsert>,
    tx: Tx,
  ) {
    return this.writeRepo.updateUserById(userId, values, tx);
  }

  setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    tx: Tx,
  ) {
    return this.writeRepo.setPasswordResetToken(userId, tokenHash, expiresAt, tx);
  }

  insertEmployee(values: typeof schema.employees.$inferInsert, tx: Tx) {
    return this.writeRepo.insertEmployee(values, tx);
  }

  insertEmploymentRecord(
    values: typeof schema.employmentRecords.$inferInsert,
    tx: Tx,
  ) {
    return this.writeRepo.insertEmploymentRecord(values, tx);
  }

  insertOrgAssignment(
    values: typeof schema.orgAssignments.$inferInsert,
    tx: Tx,
  ) {
    return this.writeRepo.insertOrgAssignment(values, tx);
  }

  updateEmployee(whereClause: any, values: any, tx: Tx) {
    return this.writeRepo.updateEmployee(whereClause, values, tx);
  }

  updateEmployeeById(employeeId: string, values: any, tx: Tx) {
    return this.writeRepo.updateEmployeeById(employeeId, values, tx);
  }

  deleteEmployee(employeeId: string, tx: Tx) {
    return this.writeRepo.deleteEmployee(employeeId, tx);
  }

  softDeleteEmployee(employeeId: string, tx: Tx) {
    return this.writeRepo.softDeleteEmployee(employeeId, tx);
  }

  deleteUser(userId: string, tx: Tx) {
    return this.writeRepo.deleteUser(userId, tx);
  }

  async replaceEmployeeAvatar(
    employeeId: string,
    attachmentId: string | null,
    tx?: Tx,
  ) {
    return this.writeRepo.replaceEmployeeAvatar(employeeId, attachmentId, tx);
  }

  bindEmployeeAvatar(employeeId: string, attachmentId: string, tx?: Tx) {
    return this.writeRepo.bindEmployeeAvatar(employeeId, attachmentId, tx);
  }

  // -- Read-then-write orchestration (facade-level) -----------------

  async upsertCurrentEmploymentRecord(
    employeeId: string,
    values: any,
    tx: Tx,
  ) {
    const current =
      await this.readRepo.findCurrentEmploymentRecord(employeeId, tx);
    if (current) {
      return this.writeRepo.updateEmploymentRecordById(current.id, values, tx);
    }
    return this.writeRepo.insertEmploymentRecord(
      {
        employeeId,
        startDate: values.startDate ?? todayDateString(),
        isCurrent: true,
        ...values,
      },
      tx,
    );
  }

  async upsertCurrentOrgAssignment(
    employeeId: string,
    values: any,
    tx: Tx,
  ) {
    const current =
      await this.readRepo.findCurrentOrgAssignment(employeeId, tx);
    if (current) {
      return this.writeRepo.updateOrgAssignmentById(current.id, values, tx);
    }
    return this.writeRepo.insertOrgAssignment(
      {
        employeeId,
        assignmentType: "primary",
        isCurrent: true,
        effectiveFrom:
          values.effectiveFrom ?? todayDateString(),
        ...values,
      },
      tx,
    );
  }

  async listStatusHistory(employeeId: string, limit = 50) {
    return this.readRepo.listStatusHistory(employeeId, limit);
  }
}
