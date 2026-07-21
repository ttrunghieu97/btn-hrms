import { ApiProperty } from "@nestjs/swagger";

export class ApiMetaDto {
  @ApiProperty()
  requestId: string;

  @ApiProperty()
  timestamp: string;
}

export class PaginationInfoDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasNext: boolean;
}

export class PaginatedMetaDto extends ApiMetaDto {
  @ApiProperty({ type: PaginationInfoDto })
  pagination: PaginationInfoDto;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: {
      total: number;
      page: number;
      limit: number;
      hasNext: boolean;
    };
    [key: string]: any;
  };
}

export class SuccessFlagDto {
  @ApiProperty()
  ok: boolean;
}

export class RevocationResultDto extends SuccessFlagDto {
  @ApiProperty()
  revoked: number;
}

export class AccessTokenDto {
  @ApiProperty()
  access_token: string;
}

export class ApiEnvelopeDto<T> {
  @ApiProperty()
  data: T;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class PaginatedEnvelopeDto<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class AccessTokenEnvelopeDto {
  @ApiProperty({ type: AccessTokenDto })
  data: AccessTokenDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class SuccessFlagEnvelopeDto {
  @ApiProperty({ type: SuccessFlagDto })
  data: SuccessFlagDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class RevocationEnvelopeDto {
  @ApiProperty({ type: RevocationResultDto })
  data: RevocationResultDto;

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class StringArrayEnvelopeDto {
  @ApiProperty({ type: [String] })
  data: string[];

  @ApiProperty({ type: ApiMetaDto })
  meta: ApiMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}

export class EmptyPaginatedEnvelopeDto {
  @ApiProperty({ type: [Object] })
  data: unknown[];

  @ApiProperty({ type: PaginatedMetaDto })
  meta: PaginatedMetaDto;

  @ApiProperty({ type: String, nullable: true, default: null })
  error: null;
}
