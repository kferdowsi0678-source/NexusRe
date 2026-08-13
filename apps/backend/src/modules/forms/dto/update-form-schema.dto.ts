import { PartialType } from '@nestjs/swagger';
import { CreateFormSchemaDto } from './create-form-schema.dto';

/**
 * Every field is optional. Editing a *published* version never mutates it —
 * the service forks a new draft version carrying these changes instead.
 */
export class UpdateFormSchemaDto extends PartialType(CreateFormSchemaDto) {}
