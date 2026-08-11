import { matchAppetite, rankMatches, MatchableSubmission } from './appetite-matching';
import { RiskAppetite, StructurePreference } from './entities/risk-appetite.entity';
import { LineOfBusiness, SubmissionType } from '../submissions/entities/submission.entity';

const appetite = (overrides: Partial<RiskAppetite> = {}): RiskAppetite =>
  ({
    id: 'ap-1',
    name: 'Test appetite',
    reinsurerId: 'org-1',
    linesOfBusiness: [LineOfBusiness.PROPERTY],
    submissionTypes: [],
    countries: [],
    worldwide: false,
    structurePreference: StructurePreference.ANY,
    isActive: true,
    ...overrides,
  }) as RiskAppetite;

const risk = (overrides: Partial<MatchableSubmission> = {}): MatchableSubmission => ({
  lineOfBusiness: LineOfBusiness.PROPERTY,
  type: SubmissionType.FACULTATIVE,
  ...overrides,
});

describe('matchAppetite', () => {
  it('rules out a line of business they do not write', () => {
    const result = matchAppetite(risk({ lineOfBusiness: LineOfBusiness.MARINE }), appetite());
    expect(result.eligible).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reasons[0]).toMatch(/Does not write marine/);
  });

  it('rules out an inactive appetite', () => {
    expect(matchAppetite(risk(), appetite({ isActive: false })).eligible).toBe(false);
  });

  it('rules out the wrong structure of business', () => {
    const treatyOnly = appetite({ submissionTypes: [SubmissionType.TREATY] });
    expect(matchAppetite(risk(), treatyOnly).eligible).toBe(false);
  });

  it('rules out a territory they have excluded', () => {
    const kenyaOnly = appetite({ countries: ['Kenya'] });
    const result = matchAppetite(risk({ country: 'Nigeria' }), kenyaOnly);
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('Does not cover Nigeria');
  });

  it('scores a named territory above a worldwide one', () => {
    const named = matchAppetite(risk({ country: 'Kenya' }), appetite({ countries: ['Kenya'] }));
    const global = matchAppetite(risk({ country: 'Kenya' }), appetite({ worldwide: true }));
    expect(named.score).toBeGreaterThan(global.score);
  });

  it('passes an unknown territory through without ruling it out', () => {
    const result = matchAppetite(risk({ country: null }), appetite({ countries: ['Kenya'] }));
    expect(result.eligible).toBe(true);
    expect(result.reasons).toContain('Territory unknown, geography unconfirmed');
  });

  it('rewards a sum insured inside the stated band', () => {
    const banded = appetite({ minSumInsured: 1_000_000, maxSumInsured: 10_000_000 } as any);
    const inside = matchAppetite(risk({ sumInsured: 5_000_000 }), banded);
    expect(inside.reasons).toContain('Within their stated band');
    expect(inside.score).toBe(85);
  });

  it('penalises but still allows a risk above the band', () => {
    const banded = appetite({ minSumInsured: 1_000_000, maxSumInsured: 10_000_000 } as any);
    const above = matchAppetite(risk({ sumInsured: 50_000_000 }), banded);
    expect(above.eligible).toBe(true);
    expect(above.reasons).toContain('Above their usual maximum, may take a share');
    expect(above.score).toBeLessThan(
      matchAppetite(risk({ sumInsured: 5_000_000 }), banded).score,
    );
  });

  it('keeps the score inside nought to a hundred', () => {
    const generous = appetite({
      worldwide: true,
      minSumInsured: 1,
      maxSumInsured: 1_000_000_000,
    } as any);
    const result = matchAppetite(risk({ sumInsured: 5_000_000, country: 'Kenya' }), generous);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('rankMatches', () => {
  it('orders by score, breaking ties on name', () => {
    const ranked = rankMatches([
      { score: 50, reinsurerName: 'Zurich Re' },
      { score: 90, reinsurerName: 'Munich Re' },
      { score: 50, reinsurerName: 'Africa Re' },
    ]);
    expect(ranked.map((r) => r.reinsurerName)).toEqual(['Munich Re', 'Africa Re', 'Zurich Re']);
  });

  it('does not mutate its input', () => {
    const input = [
      { score: 10, reinsurerName: 'B' },
      { score: 20, reinsurerName: 'A' },
    ];
    rankMatches(input);
    expect(input[0].reinsurerName).toBe('B');
  });
});
