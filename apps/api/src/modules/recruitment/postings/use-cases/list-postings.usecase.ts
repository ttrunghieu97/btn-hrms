import { Injectable } from "@nestjs/common";
import { PostingQueryDto } from "../dto/posting-query.dto";
import { PostingMapper } from "../mappers/posting.mapper";
import { PostingsRepository } from "../repositories/postings.repository";

@Injectable()
export class ListPostingsUseCase {
  constructor(private readonly postingsRepo: PostingsRepository) {}

  async execute(query: PostingQueryDto) {
    const result = await this.postingsRepo.list(query);
    return {
      rows: PostingMapper.toResponseList(result.rows),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }
}
