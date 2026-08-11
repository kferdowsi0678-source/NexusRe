import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LineOfBusiness, SubmissionType } from '../../submissions/entities/submission.entity';
import { StructurePreference } from '../entities/risk-appetite.entity';

export class CreateRiskAppetiteDto {
  @ApiProperty({ example: 'African property fac' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: LineOfBusiness, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(LineOfBusiness, { each: true })
  linesOfBusiness: LineOfBusiness[];

  @ApiProperty({ enum: SubmissionType, isArray: true, required: false })
  @IsArray()
  @IsEnum(SubmissionType, { each: true })
  @IsOptional()
  submissionTypes?: SubmissionType[];

  @ApiProperty({ required: false, example: ['Nigeria', 'Kenya'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  countries?: string[];

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  worldwide?: boolean;

  @ApiProperty({ enum: StructurePreference, required: false })
  @IsEnum(StructurePreference)
  @IsOptional()
  structurePreference?: StructurePreference;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minSumInsured?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxSumInsured?: number;

  @ApiProperty({ required: false, example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false, description: 'Largest share they will take, percent' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxCapacityShare?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
