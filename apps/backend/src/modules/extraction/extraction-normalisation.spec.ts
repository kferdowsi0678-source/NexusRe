import { LineOfBusiness } from '../submissions/entities/submission.entity';
import {
  ExtractedField,
  FieldReviewStatus,
  applyFieldsToRiskDetails,
  extractionCoverage,
  normaliseExtractedFields,
  parseCurrency,
  parseMonetaryValue,
  resolveFieldValue,
} from './extraction-normalisation';

function field(overrides: Partial<ExtractedField> = {}): ExtractedField {
  return {
    key: 'property.occupancy',
    label: 'Occupancy',
    value: 'Warehouse',
    confidence: 0.9,
    status: FieldReviewStatus.SUGGESTED,
    ...overrides,
  };
}

describe('normaliseExtractedFields', () => {
  it('returns an empty array for anything that is not a list', () => {
    expect(normaliseExtractedFields(null)).toEqual([]);
    expect(normaliseExtractedFields('fields')).toEqual([]);
    expect(normaliseExtractedFields({ fields: [] })).toEqual([]);
  });

  it('keeps well-formed fields and marks them as unreviewed', () => {
    const [result] = normaliseExtractedFields([
      { key: 'property.occupancy', label: 'Occupancy', value: 'Warehouse', confidence: 0.8 },
    ]);

    expect(result.key).toBe('property.occupancy');
    expect(result.value).toBe('Warehouse');
    expect(result.status).toBe(FieldReviewStatus.SUGGESTED);
  });

  it('drops placeholder values that look like answers but are not', () => {
    const results = normaliseExtractedFields([
      { key: 'a', label: 'A', value: 'N/A', confidence: 0.9 },
      { key: 'b', label: 'B', value: 'not stated', confidence: 0.9 },
      { key: 'c', label: 'C', value: '   ', confidence: 0.9 },
      { key: 'd', label: 'D', value: 'Concrete', confidence: 0.9 },
    ]);

    expect(results.map((f) => f.key)).toEqual(['d']);
  });

  it('strips unsafe key segments and rejects prototype pollution attempts', () => {
    const results = normaliseExtractedFields([
      { key: '__proto__.polluted', label: 'X', value: 'bad', confidence: 1 },
      { key: 'constructor', label: 'Y', value: 'bad', confidence: 1 },
      { key: '  Building Type ', label: 'Z', value: 'Steel frame', confidence: 1 },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].key).toBe('Building_Type');
  });

  it('de-duplicates repeated keys, keeping the first reading', () => {
    const results = normaliseExtractedFields([
      { key: 'sum_insured', label: 'Sum insured', value: 1000, confidence: 0.9 },
      { key: 'sum_insured', label: 'Sum insured', value: 2000, confidence: 0.4 },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].value).toBe(1000);
  });

  it('clamps confidence and rescales a 0-100 answer', () => {
    const results = normaliseExtractedFields([
      { key: 'a', label: 'A', value: 'x', confidence: 85 },
      { key: 'b', label: 'B', value: 'x', confidence: -3 },
      { key: 'c', label: 'C', value: 'x', confidence: 'high' },
    ]);

    expect(results.map((f) => f.confidence)).toEqual([0.85, 0, 0.5]);
  });

  it('derives a readable label when the model omits one', () => {
    const [result] = normaliseExtractedFields([
      { key: 'property.construction_type', value: 'Steel', confidence: 0.7 },
    ]);

    expect(result.label).toBe('Construction type');
  });

  it('caps the number of fields it will store', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      key: `field_${i}`,
      label: `Field ${i}`,
      value: 'x',
      confidence: 0.9,
    }));

    expect(normaliseExtractedFields(many)).toHaveLength(80);
  });

  it('rejects keys nested deeper than four segments', () => {
    expect(
      normaliseExtractedFields([
        { key: 'a.b.c.d.e', label: 'Too deep', value: 'x', confidence: 1 },
      ]),
    ).toEqual([]);
  });
});

describe('parseMonetaryValue', () => {
  it('reads plain numbers unchanged', () => {
    expect(parseMonetaryValue(12500)).toBe(12500);
  });

  it('reads the anglophone convention', () => {
    expect(parseMonetaryValue('USD 12,500,000.50')).toBe(12500000.5);
  });

  it('reads the francophone convention', () => {
    expect(parseMonetaryValue('EUR 3.500.000,25')).toBe(3500000.25);
  });

  it('reads space-separated groups', () => {
    expect(parseMonetaryValue('3 500 000')).toBe(3500000);
  });

  it('expands k, m and bn suffixes', () => {
    expect(parseMonetaryValue('$1.2m')).toBe(1_200_000);
    expect(parseMonetaryValue('750k')).toBe(750_000);
    expect(parseMonetaryValue('2 bn')).toBe(2_000_000_000);
  });

  it('returns null rather than guessing zero when there is no figure', () => {
    expect(parseMonetaryValue('to be advised')).toBeNull();
    expect(parseMonetaryValue('')).toBeNull();
    expect(parseMonetaryValue(null)).toBeNull();
  });
});

describe('parseCurrency', () => {
  it('finds an ISO code', () => {
    expect(parseCurrency('Sum insured NGN 400,000,000')).toBe('NGN');
  });

  it('maps a symbol when no code is present', () => {
    expect(parseCurrency('£2.5m')).toBe('GBP');
  });

  it('returns null when there is nothing to go on', () => {
    expect(parseCurrency('2,500,000')).toBeNull();
  });
});

describe('resolveFieldValue', () => {
  it('applies nothing for a field nobody reviewed', () => {
    expect(resolveFieldValue(field())).toBeNull();
  });

  it('applies the original value when accepted', () => {
    expect(resolveFieldValue(field({ status: FieldReviewStatus.ACCEPTED }))).toBe('Warehouse');
  });

  it('applies the correction when edited', () => {
    const edited = field({
      status: FieldReviewStatus.EDITED,
      correctedValue: 'Cold storage warehouse',
    });
    expect(resolveFieldValue(edited)).toBe('Cold storage warehouse');
  });

  it('applies nothing when rejected', () => {
    expect(resolveFieldValue(field({ status: FieldReviewStatus.REJECTED }))).toBeNull();
  });
});

describe('applyFieldsToRiskDetails', () => {
  it('writes accepted fields into a nested path', () => {
    const { riskDetails, appliedKeys } = applyFieldsToRiskDetails(null, [
      field({ status: FieldReviewStatus.ACCEPTED }),
    ]);

    expect(riskDetails).toEqual({ property: { occupancy: 'Warehouse' } });
    expect(appliedKeys).toEqual(['property.occupancy']);
  });

  it('leaves the caller\'s object untouched', () => {
    const original = { property: { occupancy: 'Office' } };
    const { riskDetails } = applyFieldsToRiskDetails(original, [
      field({ status: FieldReviewStatus.ACCEPTED }),
    ]);

    expect(original.property.occupancy).toBe('Office');
    expect((riskDetails.property as Record<string, unknown>).occupancy).toBe('Warehouse');
  });

  it('skips suggested and rejected fields', () => {
    const { riskDetails, appliedKeys } = applyFieldsToRiskDetails({}, [
      field({ key: 'a', status: FieldReviewStatus.SUGGESTED }),
      field({ key: 'b', status: FieldReviewStatus.REJECTED }),
    ]);

    expect(riskDetails).toEqual({});
    expect(appliedKeys).toEqual([]);
  });

  it('refuses to overwrite a populated sub-tree with a scalar', () => {
    const existing = { property: 'a free text description' };
    const { riskDetails, appliedKeys } = applyFieldsToRiskDetails(existing, [
      field({ status: FieldReviewStatus.ACCEPTED }),
    ]);

    expect(riskDetails).toEqual(existing);
    expect(appliedKeys).toEqual([]);
  });

  it('merges alongside existing sibling values', () => {
    const { riskDetails } = applyFieldsToRiskDetails(
      { property: { construction: 'Concrete' } },
      [field({ status: FieldReviewStatus.ACCEPTED })],
    );

    expect(riskDetails.property).toEqual({
      construction: 'Concrete',
      occupancy: 'Warehouse',
    });
  });
});

describe('extractionCoverage', () => {
  it('is zero for an empty extraction', () => {
    expect(extractionCoverage([], LineOfBusiness.PROPERTY)).toBe(0);
  });

  it('ignores low-confidence fields', () => {
    const fields = [field({ key: 'a', confidence: 0.2 }), field({ key: 'b', confidence: 0.3 })];
    expect(extractionCoverage(fields, LineOfBusiness.PROPERTY)).toBe(0);
  });

  it('never exceeds 100 when a document is unusually rich', () => {
    const fields = Array.from({ length: 40 }, (_, i) => field({ key: `f${i}` }));
    expect(extractionCoverage(fields, LineOfBusiness.PROPERTY)).toBe(100);
  });

  it('falls back to a default expectation for lines without a specific count', () => {
    const fields = Array.from({ length: 5 }, (_, i) => field({ key: `f${i}` }));
    expect(extractionCoverage(fields, LineOfBusiness.MOTOR)).toBe(50);
  });
});
