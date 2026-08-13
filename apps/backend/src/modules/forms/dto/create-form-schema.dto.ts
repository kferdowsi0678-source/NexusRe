import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FormType } from '../entities/form-schema.entity';
import { LineOfBusiness } from '../../submissions/entities/submission.entity';

export class CreateFormSchemaDto {
  @ApiProperty({ example: 'Property Facultative Form' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: FormType })
  @IsEnum(FormType)
  @IsNotEmpty()
  formType: FormType;

  @ApiProperty({ required: false, default: '1.0.0', description: 'Defaults to 1.0.0' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  version?: string;

  @ApiProperty({ type: 'object', description: 'JSON Schema body driving the dynamic form' })
  @IsObject()
  schema: Record<string, any>;

  @ApiProperty({ type: 'object', required: false })
  @IsObject()
  @IsOptional()
  uiSchema?: Record<string, any>;

  @ApiProperty({ type: 'object', required: false })
  @IsObject()
  @IsOptional()
  validationRules?: Record<string, any>;

  @ApiProperty({ enum: LineOfBusiness, required: false })
  @IsEnum(LineOfBusiness)
  @IsOptional()
  lineOfBusiness?: LineOfBusiness;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
