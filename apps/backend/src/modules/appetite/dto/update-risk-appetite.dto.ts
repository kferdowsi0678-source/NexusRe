import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateRiskAppetiteDto } from './create-risk-appetite.dto';

export class UpdateRiskAppetiteDto extends PartialType(CreateRiskAppetiteDto) {
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
