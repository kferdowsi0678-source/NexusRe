import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormSchema, FormType } from './entities/form-schema.entity';
import { CreateFormSchemaDto } from './dto/create-form-schema.dto';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(FormSchema)
    private formSchemaRepository: Repository<FormSchema>,
  ) {}

  async create(createFormSchemaDto: CreateFormSchemaDto): Promise<FormSchema> {
    const formSchema = this.formSchemaRepository.create(createFormSchemaDto);
    return this.formSchemaRepository.save(formSchema);
  }

  async findAll(): Promise<FormSchema[]> {
    return this.formSchemaRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByType(formType: FormType): Promise<FormSchema> {
    const schema = await this.formSchemaRepository.findOne({
      where: { formType, isActive: true },
      order: { version: 'DESC' },
    });

    if (!schema) {
      throw new NotFoundException(`Form schema for type ${formType} not found`);
    }

    return schema;
  }

  async findOne(id: string): Promise<FormSchema> {
    const schema = await this.formSchemaRepository.findOne({ where: { id } });
    if (!schema) {
      throw new NotFoundException('Form schema not found');
    }
    return schema;
  }

  async validateFormData(formType: FormType, data: any): Promise<{ valid: boolean; errors: string[] }> {
    const schema = await this.findByType(formType);
    const errors: string[] = [];

    // Basic validation against schema
    if (schema.schema.required) {
      for (const field of schema.schema.required) {
        if (!data[field]) {
          errors.push(`Field '${field}' is required`);
        }
      }
    }

    // Type validation
    for (const [fieldName, fieldDef] of Object.entries(schema.schema.properties || {})) {
      const fieldValue = data[fieldName];
      const fieldType = (fieldDef as any).type;

      if (fieldValue !== undefined && fieldValue !== null) {
        if (fieldType === 'number' && typeof fieldValue !== 'number') {
          errors.push(`Field '${fieldName}' must be a number`);
        }
        if (fieldType === 'string' && typeof fieldValue !== 'string') {
          errors.push(`Field '${fieldName}' must be a string`);
        }
        if (fieldType === 'boolean' && typeof fieldValue !== 'boolean') {
          errors.push(`Field '${fieldName}' must be a boolean`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
