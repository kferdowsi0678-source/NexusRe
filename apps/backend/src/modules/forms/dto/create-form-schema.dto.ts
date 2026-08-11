import { IsString, IsEnum, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FormType } from '../entities/form-schema.entity';

export class CreateFormSchemaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: FormType })
  @IsEnum(FormType)
  @IsNotEmpty()
  formType: FormType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({ type: 'object' })
  @IsNotEmpty()
  schema: any;

  @ApiProperty({ type: 'object', required: false })
  @IsOptional()
  uiSchema?: any;

  @ApiProperty({ type: 'object', required: false })
  @IsOptional()
  validationRules?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
