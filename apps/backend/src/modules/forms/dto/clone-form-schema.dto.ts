import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FormType } from '../entities/form-schema.entity';
import { LineOfBusiness } from '../../submissions/entities/submission.entity';

/**
 * Every field is optional — an empty body clones the source into a new draft
 * version of the same schema family.
 */
export class CloneFormSchemaDto {
  @ApiProperty({ required: false, description: 'Name for the copy. Defaults to the source name.' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false, description: 'Version for the copy. Defaults to the next free one.' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  version?: string;

  @ApiProperty({ enum: FormType, required: false })
  @IsEnum(FormType)
  @IsOptional()
  formType?: FormType;

  @ApiProperty({ enum: LineOfBusiness, required: false })
  @IsEnum(LineOfBusiness)
  @IsOptional()
  lineOfBusiness?: LineOfBusiness;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
