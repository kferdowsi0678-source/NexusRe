import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { FormSchema, FormType } from './entities/form-schema.entity';
import { CreateFormSchemaDto } from './dto/create-form-schema.dto';
import { UpdateFormSchemaDto } from './dto/update-form-schema.dto';
import { CloneFormSchemaDto } from './dto/clone-form-schema.dto';
import {
  FormSchemaProblem,
  nextVersion,
  validateFormSchemaDefinition,
} from './form-schema-validation';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request';

const DEFAULT_VERSION = '1.0.0';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(FormSchema)
    private formSchemaRepository: Repository<FormSchema>,
  ) {}

  // ---------------------------------------------------------------------
  // Consumer reads — the submission wizard depends on these exactly as they
  // are. Drafts never appear here because a draft is stored with isActive
  // false until an administrator publishes it.
  // ---------------------------------------------------------------------

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

  // ---------------------------------------------------------------------
  // Admin catalogue
  // ---------------------------------------------------------------------

  /** Every version of every schema, drafts included. */
  async adminFindAll(): Promise<FormSchema[]> {
    return this.formSchemaRepository.find({
      order: { name: 'ASC', createdAt: 'DESC' },
    });
  }

  /** All versions belonging to the same schema family as `id`, newest first. */
  async adminFindVersions(id: string): Promise<FormSchema[]> {
    const target = await this.findOne(id);
    return this.formSchemaRepository.find({
      where: { name: target.name },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Creates a new schema. Always a draft — a version only becomes visible to
   * cedants once it is explicitly published.
   */
  async create(dto: CreateFormSchemaDto, actor?: AuthenticatedUser): Promise<FormSchema> {
    this.assertRenderable(dto.schema, dto.uiSchema);

    const version = dto.version || DEFAULT_VERSION;
    await this.assertVersionFree(dto.name, version);

    return this.formSchemaRepository.save(
      this.formSchemaRepository.create({
        name: dto.name,
        formType: dto.formType,
        version,
        schema: dto.schema,
        uiSchema: dto.uiSchema ?? null,
        validationRules: dto.validationRules ?? null,
        lineOfBusiness: dto.lineOfBusiness ?? null,
        description: dto.description,
        isActive: false,
        isPublished: false,
        createdById: actor?.userId ?? null,
      }),
    );
  }

  /**
   * Edits a schema version. A draft is edited in place; a published version is
   * immutable, so the changes are forked into a fresh draft version instead.
   * The caller can tell which happened by comparing the returned id.
   */
  async update(
    id: string,
    dto: UpdateFormSchemaDto,
    actor?: AuthenticatedUser,
  ): Promise<FormSchema> {
    const target = await this.findOne(id);

    const schema = dto.schema ?? target.schema;
    const uiSchema = dto.uiSchema !== undefined ? dto.uiSchema : target.uiSchema;
    this.assertRenderable(schema, uiSchema);

    const name = dto.name ?? target.name;

    if (!target.isPublished) {
      const version = dto.version ?? target.version;
      if (name !== target.name || version !== target.version) {
        await this.assertVersionFree(name, version, target.id);
      }

      Object.assign(target, {
        name,
        formType: dto.formType ?? target.formType,
        version,
        schema,
        uiSchema,
        validationRules:
          dto.validationRules !== undefined ? dto.validationRules : target.validationRules,
        lineOfBusiness: dto.lineOfBusiness ?? target.lineOfBusiness,
        description: dto.description ?? target.description,
      });
      return this.formSchemaRepository.save(target);
    }

    const version = dto.version ?? (await this.suggestNextVersion(name, target.version));
    await this.assertVersionFree(name, version);

    return this.formSchemaRepository.save(
      this.formSchemaRepository.create({
        name,
        formType: dto.formType ?? target.formType,
        version,
        schema,
        uiSchema,
        validationRules:
          dto.validationRules !== undefined ? dto.validationRules : target.validationRules,
        lineOfBusiness: dto.lineOfBusiness ?? target.lineOfBusiness,
        description: dto.description ?? target.description,
        isActive: false,
        isPublished: false,
        createdById: actor?.userId ?? null,
      }),
    );
  }

  /** Copies a version into a new draft, the usual starting point for an edit. */
  async clone(
    id: string,
    dto: CloneFormSchemaDto,
    actor?: AuthenticatedUser,
  ): Promise<FormSchema> {
    const source = await this.findOne(id);
    const name = dto.name ?? source.name;
    const version = dto.version ?? (await this.suggestNextVersion(name, source.version));

    await this.assertVersionFree(name, version);

    return this.formSchemaRepository.save(
      this.formSchemaRepository.create({
        name,
        formType: dto.formType ?? source.formType,
        version,
        schema: source.schema,
        uiSchema: source.uiSchema,
        validationRules: source.validationRules,
        lineOfBusiness: dto.lineOfBusiness ?? source.lineOfBusiness,
        description: dto.description ?? source.description,
        isActive: false,
        isPublished: false,
        createdById: actor?.userId ?? null,
      }),
    );
  }

  /**
   * Makes a version live. The schema is re-checked first — a row could have
   * been seeded or written before these rules existed. Sibling versions of the
   * same schema step down so exactly one version of a family is ever live.
   */
  async publish(id: string, actor?: AuthenticatedUser): Promise<FormSchema> {
    const target = await this.findOne(id);
    this.assertRenderable(target.schema, target.uiSchema);

    await this.formSchemaRepository.update(
      { name: target.name, id: Not(target.id) },
      { isPublished: false, isActive: false },
    );

    target.isPublished = true;
    target.isActive = true;
    target.publishedAt = new Date();
    target.publishedById = actor?.userId ?? null;
    return this.formSchemaRepository.save(target);
  }

  /** Withdraws a version. Cedants stop seeing it immediately. */
  async unpublish(id: string): Promise<FormSchema> {
    const target = await this.findOne(id);
    target.isPublished = false;
    target.isActive = false;
    return this.formSchemaRepository.save(target);
  }

  /** Dry run for the editor — reports problems without touching the database. */
  checkDefinition(
    schema: unknown,
    uiSchema?: unknown,
  ): { valid: boolean; problems: FormSchemaProblem[] } {
    const problems = validateFormSchemaDefinition(schema, uiSchema);
    return { valid: problems.length === 0, problems };
  }

  // ---------------------------------------------------------------------

  /** Throws with the complete problem list rather than the first failure. */
  private assertRenderable(schema: unknown, uiSchema?: unknown): void {
    const problems = validateFormSchemaDefinition(schema, uiSchema);
    if (problems.length === 0) return;

    throw new BadRequestException({
      message: `Form schema is not valid (${problems.length} problem${problems.length === 1 ? '' : 's'})`,
      errors: problems,
    });
  }

  private async assertVersionFree(name: string, version: string, ignoreId?: string): Promise<void> {
    const clash = await this.formSchemaRepository.findOne({ where: { name, version } });
    if (clash && clash.id !== ignoreId) {
      throw new BadRequestException({
        message: `Version ${version} of "${name}" already exists`,
        errors: [{ path: 'version', message: `Version ${version} of "${name}" already exists.` }],
      });
    }
  }

  private async suggestNextVersion(name: string, current: string): Promise<string> {
    const siblings = await this.formSchemaRepository.find({ where: { name } });
    return nextVersion(current, siblings.map((s) => s.version));
  }
}
