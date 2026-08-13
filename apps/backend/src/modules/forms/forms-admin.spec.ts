import { BadRequestException } from '@nestjs/common';
import { FormsService } from './forms.service';
import { FormSchema, FormType } from './entities/form-schema.entity';

const VALID_SCHEMA = {
  type: 'object',
  required: ['propertyType'],
  properties: {
    propertyType: { type: 'string', enum: ['building', 'warehouse'], title: 'Property Type' },
    yearBuilt: { type: 'number', title: 'Year Built' },
  },
};

const ACTOR = { userId: 'user-1', email: 'a@b.c', organizationId: 'org-1', roles: ['super_admin'] };

/** Minimal in-memory stand-in for Repository<FormSchema>. */
function fakeRepo(seed: Partial<FormSchema>[] = []) {
  let counter = 0;
  const rows: any[] = seed.map((row) => ({ createdAt: new Date(++counter * 1000), ...row }));

  const matches = (row: any, where: any) =>
    Object.entries(where ?? {}).every(([key, value]: [string, any]) =>
      value && typeof value === 'object' && value._type === 'not'
        ? row[key] !== value._value
        : row[key] === value,
    );

  return {
    rows,
    find: jest.fn(async ({ where }: any = {}) => rows.filter((r) => matches(r, where))),
    findOne: jest.fn(async ({ where }: any) => rows.find((r) => matches(r, where)) ?? null),
    create: jest.fn((data: any) => ({ ...data })),
    save: jest.fn(async (row: any) => {
      if (!row.id) {
        row.id = `generated-${++counter}`;
        row.createdAt = new Date(counter * 1000);
        rows.push(row);
      }
      return row;
    }),
    update: jest.fn(async (where: any, patch: any) => {
      rows.filter((r) => matches(r, where)).forEach((r) => Object.assign(r, patch));
      return { affected: 0 };
    }),
  };
}

const published = (over: Partial<FormSchema> = {}): Partial<FormSchema> => ({
  id: 'published-1',
  name: 'Property Facultative Form',
  formType: FormType.PROPERTY_FACULTATIVE,
  version: '1.0.0',
  schema: VALID_SCHEMA,
  uiSchema: null,
  isActive: true,
  isPublished: true,
  ...over,
});

describe('form schema admin lifecycle', () => {
  it('creates new schemas as unpublished drafts so cedants never see them', async () => {
    const repo = fakeRepo();
    const service = new FormsService(repo as any);

    const draft = await service.create(
      {
        name: 'Cyber Facultative Form',
        formType: FormType.PROPERTY_FACULTATIVE,
        schema: VALID_SCHEMA,
      },
      ACTOR,
    );

    expect(draft.isPublished).toBe(false);
    expect(draft.isActive).toBe(false);
    expect(draft.version).toBe('1.0.0');
    expect(draft.createdById).toBe('user-1');
  });

  it('refuses to save a schema the renderer could not draw, listing every problem', async () => {
    const service = new FormsService(fakeRepo() as any);

    await expect(
      service.create({
        name: 'Broken Form',
        formType: FormType.PROPERTY_FACULTATIVE,
        schema: { type: 'object', properties: { a: { type: 'datetime' }, b: {} } },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const error = await service
      .create({
        name: 'Broken Form',
        formType: FormType.PROPERTY_FACULTATIVE,
        schema: { type: 'object', properties: { a: { type: 'datetime' }, b: {} } },
      })
      .catch((e) => e.getResponse());

    expect(error.errors).toHaveLength(2);
    expect(error.message).toContain('2 problems');
  });

  it('rejects a version number already used by the same schema', async () => {
    const repo = fakeRepo([published()]);
    const service = new FormsService(repo as any);

    await expect(
      service.create({
        name: 'Property Facultative Form',
        formType: FormType.PROPERTY_FACULTATIVE,
        version: '1.0.0',
        schema: VALID_SCHEMA,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('edits a draft in place', async () => {
    const repo = fakeRepo([published({ id: 'draft-1', isPublished: false, isActive: false })]);
    const service = new FormsService(repo as any);

    const result = await service.update('draft-1', { description: 'Revised wording' }, ACTOR);

    expect(result.id).toBe('draft-1');
    expect(result.description).toBe('Revised wording');
    expect(repo.rows).toHaveLength(1);
  });

  it('forks a published version into a new draft instead of mutating it', async () => {
    const repo = fakeRepo([published()]);
    const service = new FormsService(repo as any);

    const result = await service.update('published-1', { description: 'Second thoughts' }, ACTOR);

    expect(result.id).not.toBe('published-1');
    expect(result.version).toBe('1.0.1');
    expect(result.isPublished).toBe(false);
    expect(result.name).toBe('Property Facultative Form');
    const original = repo.rows.find((r) => r.id === 'published-1');
    expect(original.isPublished).toBe(true);
    expect(original.description).toBeUndefined();
  });

  it('clones a version into the next free draft version', async () => {
    const repo = fakeRepo([published(), published({ id: 'published-2', version: '1.0.1' })]);
    const service = new FormsService(repo as any);

    const copy = await service.clone('published-1', {}, ACTOR);

    expect(copy.version).toBe('1.0.2');
    expect(copy.isPublished).toBe(false);
    expect(copy.schema).toEqual(VALID_SCHEMA);
  });

  it('publishing activates the version and stands the siblings down', async () => {
    const repo = fakeRepo([
      published(),
      published({ id: 'draft-2', version: '1.0.1', isPublished: false, isActive: false }),
    ]);
    const service = new FormsService(repo as any);

    const result = await service.publish('draft-2', ACTOR);

    expect(result.isPublished).toBe(true);
    expect(result.isActive).toBe(true);
    expect(result.publishedById).toBe('user-1');
    expect(repo.rows.find((r) => r.id === 'published-1')).toMatchObject({
      isPublished: false,
      isActive: false,
    });
  });

  it('re-checks the stored body before publishing a legacy row', async () => {
    const repo = fakeRepo([published({ schema: { type: 'object', properties: {} } })]);
    const service = new FormsService(repo as any);

    await expect(service.publish('published-1', ACTOR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('unpublishing hides the version from the consumer endpoints', async () => {
    const repo = fakeRepo([published()]);
    const service = new FormsService(repo as any);

    const result = await service.unpublish('published-1');

    expect(result.isPublished).toBe(false);
    expect(result.isActive).toBe(false);
    await expect(service.findByType(FormType.PROPERTY_FACULTATIVE)).rejects.toThrow(
      'Form schema for type property_facultative not found',
    );
  });

  it('lists sibling versions of one schema family', async () => {
    const repo = fakeRepo([
      published(),
      published({ id: 'published-2', version: '1.0.1' }),
      published({ id: 'other-1', name: 'Energy Facultative Form' }),
    ]);
    const service = new FormsService(repo as any);

    const versions = await service.adminFindVersions('published-1');
    expect(versions.map((v) => v.id)).toEqual(['published-1', 'published-2']);
  });

  it('reports dry-run problems without writing anything', async () => {
    const repo = fakeRepo();
    const service = new FormsService(repo as any);

    expect(service.checkDefinition(VALID_SCHEMA)).toEqual({ valid: true, problems: [] });
    expect(service.checkDefinition({ type: 'object', properties: {} }).valid).toBe(false);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
