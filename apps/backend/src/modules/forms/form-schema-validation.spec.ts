import {
  isValidFormSchemaDefinition,
  nextVersion,
  validateFormSchemaDefinition,
} from './form-schema-validation';

/** A trimmed copy of the seeded Property Facultative schema. */
const VALID_SCHEMA = {
  type: 'object',
  required: ['propertyType', 'yearBuilt', 'address'],
  properties: {
    propertyType: {
      type: 'string',
      enum: ['building', 'warehouse', 'factory'],
      title: 'Property Type',
    },
    yearBuilt: { type: 'number', minimum: 1800, maximum: 2030, title: 'Year Built' },
    hasBasement: { type: 'boolean', title: 'Has Basement' },
    address: {
      type: 'object',
      required: ['street', 'city'],
      properties: {
        street: { type: 'string', title: 'Street Address' },
        city: { type: 'string', title: 'City' },
      },
    },
    nearbyRisks: {
      type: 'array',
      items: { type: 'string', enum: ['flood_zone', 'coastal'] },
      title: 'Nearby Risks',
    },
    previousClaims: {
      type: 'array',
      items: {
        type: 'object',
        properties: { year: { type: 'number' }, amount: { type: 'number' } },
      },
      title: 'Previous Claims',
    },
  },
};

const VALID_UI_SCHEMA = {
  'ui:order': [
    'propertyType',
    'yearBuilt',
    'hasBasement',
    'address',
    'nearbyRisks',
    'previousClaims',
  ],
  propertyType: { 'ui:widget': 'select' },
};

/** Deep clone so each case can mutate the fixture freely. */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const messages = (schema: unknown, uiSchema?: unknown) =>
  validateFormSchemaDefinition(schema, uiSchema).map((p) => p.message);

describe('validateFormSchemaDefinition', () => {
  it('accepts a realistic seeded schema with its uiSchema', () => {
    expect(validateFormSchemaDefinition(VALID_SCHEMA, VALID_UI_SCHEMA)).toEqual([]);
    expect(isValidFormSchemaDefinition(VALID_SCHEMA, VALID_UI_SCHEMA)).toBe(true);
  });

  it('rejects anything that is not a JSON object', () => {
    expect(messages('{"type":"object"}')).toEqual(['Schema must be a JSON object.']);
    expect(messages(null)).toEqual(['Schema must be a JSON object.']);
    expect(messages([VALID_SCHEMA])).toEqual(['Schema must be a JSON object.']);
  });

  it('requires the top-level object type and a properties map', () => {
    const problems = validateFormSchemaDefinition({ type: 'array' });
    expect(problems.map((p) => p.path)).toEqual(['schema.type', 'schema.properties']);
    expect(problems[0].message).toContain('must be "object"');
  });

  it('rejects a schema with no fields at all', () => {
    expect(messages({ type: 'object', properties: {} })).toEqual([
      'Schema declares no fields — an empty form cannot be published.',
    ]);
  });

  it('flags an unknown field type and names the supported ones', () => {
    const schema = clone(VALID_SCHEMA);
    (schema.properties as any).yearBuilt.type = 'datetime';
    const problem = validateFormSchemaDefinition(schema, VALID_UI_SCHEMA)[0];
    expect(problem.path).toBe('schema.properties.yearBuilt.type');
    expect(problem.message).toContain('unsupported type "datetime"');
    expect(problem.message).toContain('boolean');
  });

  it('flags a field with no type at all', () => {
    const schema = clone(VALID_SCHEMA);
    delete (schema.properties as any).hasBasement.type;
    expect(messages(schema, VALID_UI_SCHEMA)).toEqual([
      'Field "hasBasement" must declare a "type".',
    ]);
  });

  it('reports every problem, not just the first', () => {
    const schema = clone(VALID_SCHEMA);
    (schema.properties as any).yearBuilt.type = 'datetime';
    (schema.properties as any).hasBasement.type = 'colour';
    schema.required.push('ghostField');
    const problems = validateFormSchemaDefinition(schema, VALID_UI_SCHEMA);
    expect(problems).toHaveLength(3);
    expect(problems.map((p) => p.path)).toEqual([
      'schema.required[3]',
      'schema.properties.yearBuilt.type',
      'schema.properties.hasBasement.type',
    ]);
  });

  it('flags required entries that name fields which do not exist', () => {
    const schema = clone(VALID_SCHEMA);
    schema.required = ['propertyType', 'squareFootage'];
    expect(messages(schema, VALID_UI_SCHEMA)).toEqual([
      'Required field "squareFootage" is not declared in "properties".',
    ]);
  });

  it('flags a dangling conditional reference', () => {
    const schema = clone(VALID_SCHEMA);
    (schema.properties as any).hasBasement.showWhen = { field: 'buildingKind', equals: 'factory' };
    const problem = validateFormSchemaDefinition(schema, VALID_UI_SCHEMA)[0];
    expect(problem.path).toBe('schema.properties.hasBasement.showWhen');
    expect(problem.message).toBe('Conditional logic references unknown field "buildingKind".');
  });

  it('accepts a conditional that points at a real field and a real option', () => {
    const schema = clone(VALID_SCHEMA);
    (schema.properties as any).hasBasement.showWhen = { field: 'propertyType', equals: 'factory' };
    (schema.properties as any).yearBuilt.dependsOn = 'propertyType';
    expect(validateFormSchemaDefinition(schema, VALID_UI_SCHEMA)).toEqual([]);
  });

  it('flags a conditional comparing against a value outside the target enum', () => {
    const schema = clone(VALID_SCHEMA);
    (schema.properties as any).hasBasement.showWhen = { field: 'propertyType', equals: 'castle' };
    expect(messages(schema, VALID_UI_SCHEMA)).toEqual([
      'Conditional logic compares "propertyType" against "castle", which is not one of its options.',
    ]);
  });

  it('flags conditional logic declared in the uiSchema', () => {
    const uiSchema = { ...clone(VALID_UI_SCHEMA), hasBasement: { 'ui:showIf': { equals: 'x' } } };
    expect(messages(VALID_SCHEMA, uiSchema)).toEqual([
      'Conditional logic in "ui:showIf" does not name a field.',
    ]);
  });

  it('flags a duplicate field name reused inside a section', () => {
    const schema = clone(VALID_SCHEMA);
    (schema.properties as any).address.properties.yearBuilt = { type: 'number' };
    const problems = validateFormSchemaDefinition(schema, VALID_UI_SCHEMA);
    expect(problems).toEqual([
      {
        path: 'schema.properties.address.properties.yearBuilt',
        message:
          'Duplicate field name "yearBuilt" — already declared at schema.properties.yearBuilt.',
      },
    ]);
  });

  it('flags an empty section and an empty repeating group', () => {
    const schema = clone(VALID_SCHEMA);
    (schema.properties as any).address.properties = {};
    (schema.properties as any).previousClaims.items.properties = {};
    expect(messages(schema, VALID_UI_SCHEMA)).toEqual([
      'Section "address" has no fields — empty sections render as a blank box.',
      'Repeating group "previousClaims" has no fields — empty sections cannot be filled in.',
    ]);
  });

  it('rejects sections nested more than one level deep', () => {
    const schema = clone(VALID_SCHEMA);
    (schema.properties as any).address.properties.geo = {
      type: 'object',
      properties: { lat: { type: 'number' } },
    };
    expect(messages(schema, VALID_UI_SCHEMA)).toEqual([
      'Section "geo" nests deeper than one level, which the form renderer does not support.',
    ]);
  });

  it('flags malformed enums — empty, non-array, duplicated and non-string', () => {
    const schema = clone(VALID_SCHEMA);
    (schema.properties as any).propertyType.enum = [];
    expect(messages(schema, VALID_UI_SCHEMA)).toEqual(['"enum" must list at least one option.']);

    const notAnArray = clone(VALID_SCHEMA);
    (notAnArray.properties as any).propertyType.enum = { a: 1 };
    expect(messages(notAnArray, VALID_UI_SCHEMA)).toEqual(['"enum" must be an array of options.']);

    const mixed = clone(VALID_SCHEMA);
    (mixed.properties as any).propertyType.enum = ['building', 7, 'building'];
    expect(messages(mixed, VALID_UI_SCHEMA)).toEqual([
      'Option 7 must be a string — the renderer prints enum values directly.',
      'Duplicate option "building".',
    ]);
  });

  it('flags a malformed enum on array items', () => {
    const schema = clone(VALID_SCHEMA);
    (schema.properties as any).nearbyRisks.items.enum = 'flood_zone';
    expect(messages(schema, VALID_UI_SCHEMA)).toEqual(['"enum" must be an array of options.']);
  });

  it('requires lists to declare a supported items type', () => {
    const missing = clone(VALID_SCHEMA);
    delete (missing.properties as any).nearbyRisks.items;
    expect(messages(missing, VALID_UI_SCHEMA)).toEqual([
      'List "nearbyRisks" must declare an "items" definition.',
    ]);

    const unsupported = clone(VALID_SCHEMA);
    (unsupported.properties as any).nearbyRisks.items = { type: 'array' };
    expect(messages(unsupported, VALID_UI_SCHEMA)[0]).toContain('unsupported item type "array"');
  });

  it('flags a ui:order that hides fields or names unknown ones', () => {
    const uiSchema = { 'ui:order': ['propertyType', 'ghost'] };
    expect(messages(VALID_SCHEMA, uiSchema)).toEqual([
      '"ui:order" references unknown field "ghost".',
      '"ui:order" omits field "yearBuilt", which would stop it rendering.',
      '"ui:order" omits field "hasBasement", which would stop it rendering.',
      '"ui:order" omits field "address", which would stop it rendering.',
      '"ui:order" omits field "nearbyRisks", which would stop it rendering.',
      '"ui:order" omits field "previousClaims", which would stop it rendering.',
    ]);
  });

  it('accepts a schema without a uiSchema but rejects a non-object one', () => {
    expect(validateFormSchemaDefinition(VALID_SCHEMA)).toEqual([]);
    expect(messages(VALID_SCHEMA, 'ui')).toEqual([
      'uiSchema must be a JSON object when provided.',
    ]);
  });

  it('flags a field definition that is not an object', () => {
    const schema = { type: 'object', properties: { propertyType: 'string' } };
    expect(messages(schema)).toEqual(['Field "propertyType" must be defined as a JSON object.']);
  });
});

describe('nextVersion', () => {
  it('bumps the last numeric segment', () => {
    expect(nextVersion('1.0.0')).toBe('1.0.1');
    expect(nextVersion('2.9')).toBe('2.10');
  });

  it('skips versions already taken by the family', () => {
    expect(nextVersion('1.0.0', ['1.0.0', '1.0.1', '1.0.2'])).toBe('1.0.3');
  });

  it('falls back to a suffix when there is no number to bump', () => {
    expect(nextVersion('draft')).toBe('draft-v2');
    expect(nextVersion('draft', ['draft-v2'])).toBe('draft-v3');
  });
});
