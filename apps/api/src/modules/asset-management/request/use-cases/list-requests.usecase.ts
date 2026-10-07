import { Injectable } from "@nestjs/common";
import { RequestQueryDto } from "../dto/request-query.dto";
import { AssetRequestMapper } from "../mappers/asset-request.mapper";
import { AssetRequestRepository } from "../repositories/asset-request.repository";

@Injectable()
export class ListRequestsUseCase {
  constructor(private readonly requestRepo: AssetRequestRepository) {}

  async execute(query: RequestQueryDto) {
    const result = await this.requestRepo.list(query);
    return {
      rows: AssetRequestMapper.toResponseList(result.rows),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
