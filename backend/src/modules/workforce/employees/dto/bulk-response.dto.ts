import { ApiProperty } from "@nestjs/swagger";

export class BulkResultItem {
  @ApiProperty() employeeId!: string;
  @ApiProperty() success!: boolean;
  @ApiProperty({ required: false }) error?: string;
}

export class BulkResponseDto {
  @ApiProperty() total!: number;
  @ApiProperty() succeeded!: number;
  @ApiProperty() failed!: number;
  @ApiProperty({ type: [BulkResultItem] }) results!: BulkResultItem[];
}
