import { Injectable } from "@nestjs/common";
import { RequisitionQueryDto } from "../dto/requisition-query.dto";
import { RequisitionMapper } from "../mappers/requisition.mapper";
import { RequisitionsRepository } from "../repositories/requisitions.repository";

@Injectable()
export class ListRequisitionsUseCase {
  constructor(private readonly requisitionsRepo: RequisitionsRepository) {}

  async execute(query: RequisitionQueryDto) {
    const result = await this.requisitionsRepo.list(query);
    return {
      rows: RequisitionMapper.toResponseList(result.rows),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
