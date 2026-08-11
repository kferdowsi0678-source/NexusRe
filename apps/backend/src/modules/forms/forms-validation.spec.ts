import { NotFoundException } from '@nestjs/common';
import { FormsService } from './forms.service';
import { FormType } from './entities/form-schema.entity';

const SCHEMA = {
  type: 'object',
  required: ['propertyType', 'yearBuilt'],
  properties: {
    propertyType: { type: 'string' },
    yearBuilt: { type: 'number' },
    hasBasement: { type: 'boolean' },
  },
};

const setup = (schema: any = SCHEMA) => {
  const repo = { findOne: jest.fn().mockResolvedValue(schema ? { schema } : null) } as any;
  return new FormsService(repo);
};

describe('validateFormData', () => {
  const type = FormType.PROPERTY_FACULTATIVE;

  it('accepts a well formed payload', async () => {
    const service = setup();
    await expect(
      service.validateFormData(type, { propertyType: 'building', yearBuilt: 2015 }),
    ).resolves.toEqual({ valid: true, errors: [] });
  });

  it('names every missing required field', async () => {
    const service = setup();
    const result = await service.validateFormData(type, {});
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      "Field 'propertyType' is required",
      "Field 'yearBuilt' is required",
    ]);
  });

  it('catches mistyped values', async () => {
    const service = setup();
    const result = await service.validateFormData(type, {
      propertyType: 'building',
      yearBuilt: '2015',
      hasBasement: 'yes',
    });
    expect(result.errors).toContain("Field 'yearBuilt' must be a number");
    expect(result.errors).toContain("Field 'hasBasement' must be a boolean");
  });

  it('surfaces an unknown form type', async () => {
    const service = setup(null);
    await expect(service.validateFormData(type, {})).rejects.toBeInstanceOf(NotFoundException);
  });
});
