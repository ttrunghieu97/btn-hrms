import { Inject, Injectable } from "@nestjs/common";
import { buildPaginatedResponse } from "../../../../shared/utils/pagination.util";
import { EmployeeMapper } from "../mappers/employee.mapper";
import { EmployeeQueryDto } from "../dto/employee-query.dto";
import { EmployeesRepository } from "../repositories/employees.repository";
import { DataScope } from "../../../../core/security/types/data-scope.interface";
import { CONTRACTS_TOKENS } from "../../../../contracts/contracts.tokens";
import { PositionReaderPort } from "../../../../contracts/ports/position-reader.port";

@Injectable()
export class ListEmployeesUseCase {
  constructor(
    private readonly employeesRepo: EmployeesRepository,
    @Inject(CONTRACTS_TOKENS.POSITION_READER_PORT)
    private readonly positionReader: PositionReaderPort,
  ) {}

  async execute(query: EmployeeQueryDto, scope?: DataScope, sensitiveFieldsAllowed = false) {
    const normalizedQuery = Object.assign(new EmployeeQueryDto(), query);
    const { rows, total, page, limit } =
      await this.employeesRepo.findPaginated(normalizedQuery, scope);

    const jobTitles = Array.from(
      new Set(
        rows
          .map((row) => {
              const assignment =
                row.orgAssignments?.find((item) => item.isCurrent) ??
                row.orgAssignments?.[0];
              return assignment?.jobTitle?.trim().toLowerCase();
            })
            .filter((title): title is string => Boolean(title)),
        ),
      );

    let positions: Awaited<ReturnType<PositionReaderPort["getActivePositions"]>> = [];
    if (jobTitles.length) {
      positions = await this.positionReader.getActivePositions();
    }

    const positionsByKey = new Map(
      positions.map((position) => [
        position.name.toLowerCase(),
        {
          id: position.id,
          name: position.name,
          description: position.description,
          isActive: position.isActive
        },
      ]),
    );

    const resolvedPositions = Object.fromEntries(
      rows.map((row) => {
        const currentAssignment =
          row.orgAssignments?.find((item) => item.isCurrent) ?? row.orgAssignments?.[0];
        const name = currentAssignment?.jobTitle
          ? String(currentAssignment.jobTitle).trim().toLowerCase()
          : "";
        const resolved = name ? positionsByKey.get(name) ?? null : null;
        return [row.id, resolved];
      }),
    );

    return buildPaginatedResponse(
      EmployeeMapper.toResponseDtos(rows, resolvedPositions, {
        sensitiveFieldsAllowed,
        listView: true,
      }),
      total,
      page,
      limit,
    );
  }
}

