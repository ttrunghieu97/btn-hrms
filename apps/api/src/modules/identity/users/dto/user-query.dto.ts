import { IsOptional, IsString } from "class-validator";
import { ExpandableQueryDto } from "../../../../shared/dto/pagination.dto";

export class UserQueryRequestDto extends ExpandableQueryDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
