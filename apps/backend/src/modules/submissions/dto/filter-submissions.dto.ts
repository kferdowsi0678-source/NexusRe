import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SubmissionType, LineOfBusiness, SubmissionStatus } from '../entities/submission.entity';

export class FilterSubmissionsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: SubmissionStatus, required: false })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @ApiProperty({ enum: SubmissionType, required: false })
  @IsOptional()
  @IsEnum(SubmissionType)
  type?: SubmissionType;

  @ApiProperty({ enum: LineOfBusiness, required: false })
  @IsOptional()
  @IsEnum(LineOfBusiness)
  lineOfBusiness?: LineOfBusiness;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cedantId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ required: false, default: 'createdAt', enum: ['createdAt', 'updatedAt', 'title', 'status'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, default: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
