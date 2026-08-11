import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubmissionType, LineOfBusiness } from '../entities/submission.entity';

export class CreateSubmissionDto {
  @ApiProperty({ example: 'Property Insurance - Lagos Office Building' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: SubmissionType, example: SubmissionType.FACULTATIVE })
  @IsEnum(SubmissionType)
  @IsNotEmpty()
  type: SubmissionType;

  @ApiProperty({ enum: LineOfBusiness, example: LineOfBusiness.PROPERTY })
  @IsEnum(LineOfBusiness)
  @IsNotEmpty()
  lineOfBusiness: LineOfBusiness;

  @ApiProperty({ example: 'Office building with retail space', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 5000000, required: false })
  @IsNumber()
  @IsOptional()
  sumInsured?: number;

  @ApiProperty({ example: 'USD', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: '2024-01-01', required: false })
  @IsDateString()
  @IsOptional()
  inceptionDate?: string;

  @ApiProperty({ example: '2024-12-31', required: false })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty({ type: 'object', required: false })
  @IsOptional()
  riskDetails?: any;

  @ApiProperty({ type: 'object', required: false })
  @IsOptional()
  lossHistory?: any;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  cedantId: string;
}
