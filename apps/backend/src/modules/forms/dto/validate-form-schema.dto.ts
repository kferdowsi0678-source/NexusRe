import { IsObject, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Dry-run body for the editor's "check before saving" call. */
export class ValidateFormSchemaDto {
  @ApiProperty({ type: 'object' })
  @IsObject()
  schema: Record<string, any>;

  @ApiProperty({ type: 'object', required: false })
  @IsObject()
  @IsOptional()
  uiSchema?: Record<string, any>;
}
