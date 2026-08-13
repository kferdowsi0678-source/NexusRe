import {
  EMPTY_VALUE,
  MAX_VALUE_LENGTH,
  SlipSubmissionInput,
  buildPlacementSlip,
  buildQuoteRows,
  documentCategory,
  flattenDetails,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatFileSize,
  formatLabel,
  formatNumber,
  placementSlipFileName,
  submissionReference,
  truncate,
} from './placement-slip-content';

const GENERATED_AT = new Date('2026-08-12T09:30:00.000Z');

/** Bare on purpose: each test opts in to only the fields it asserts on. */
const buildInput = (overrides: Partial<SlipSubmissionInput> = {}): SlipSubmissionInput => ({
  id: 'b1c2d3e4-5f60-7890-abcd-ef0123456789',
  title: 'Gulf Energy Property Treaty 2026',
  type: 'treaty',
  lineOfBusiness: 'property',
  status: 'under_review',
  currency: 'usd',
  sumInsured: '25000000.00',
  completenessScore: 82,
  ...overrides,
});

describe('placement slip content', () => {
  describe('riskDetails flattening', () => {
    it('flattens nested objects into readable label/value rows', () => {
      const rows = flattenDetails({
        occupancy: 'Petrochemical plant',
        property: {
          construction: 'Steel frame',
          protection: { sprinklered: true, fireBrigade: 'On site' },
        },
      });

      expect(rows).toEqual([
        { label: 'Occupancy', value: 'Petrochemical plant' },
        { label: 'Property / Construction', value: 'Steel frame' },
        { label: 'Property / Protection / Sprinklered', value: 'Yes' },
        { label: 'Property / Protection / Fire Brigade', value: 'On site' },
      ]);
    });

    it('joins scalar arrays and indexes arrays of objects', () => {
      const rows = flattenDetails({
        territories: ['UAE', 'Oman', 'Qatar'],
        layers: [
          { attachment: 5000000, limit: 20000000 },
          { attachment: 25000000, limit: 50000000 },
        ],
      });

      expect(rows).toEqual([
        { label: 'Territories', value: 'UAE, Oman, Qatar' },
        { label: 'Layers 1 / Attachment', value: '5,000,000' },
        { label: 'Layers 1 / Limit', value: '20,000,000' },
        { label: 'Layers 2 / Attachment', value: '25,000,000' },
        { label: 'Layers 2 / Limit', value: '50,000,000' },
      ]);
    });

    it('drops empty values instead of printing blank rows', () => {
      const rows = flattenDetails({
        occupancy: 'Warehouse',
        surveyor: null,
        notes: '   ',
        extras: {},
        history: [],
        deductible: 0,
        aggregate: false,
      });

      expect(rows).toEqual([
        { label: 'Occupancy', value: 'Warehouse' },
        { label: 'Deductible', value: '0' },
        { label: 'Aggregate', value: 'No' },
      ]);
    });

    it('returns nothing for a missing riskDetails blob', () => {
      expect(flattenDetails(undefined)).toEqual([]);
      expect(flattenDetails(null)).toEqual([]);
      expect(flattenDetails({})).toEqual([]);
    });

    it('truncates a value that would overrun its column', () => {
      const long = 'x'.repeat(400);
      const [row] = flattenDetails({ narrative: long });

      expect(row.value).toHaveLength(MAX_VALUE_LENGTH);
      expect(row.value.endsWith('...')).toBe(true);
      expect(truncate('  spread   over\nlines  ')).toBe('spread over lines');
    });
  });

  describe('formatting helpers', () => {
    it('formats currency from Postgres decimal strings and falls back when absent', () => {
      expect(formatCurrency('1250000.5', 'usd')).toBe('USD 1,250,000.50');
      expect(formatCurrency(42, null)).toBe('42.00');
      expect(formatCurrency(null, 'GBP')).toBe(EMPTY_VALUE);
      expect(formatCurrency('not-a-number', 'GBP')).toBe(EMPTY_VALUE);
    });

    it('keeps small integers bare but groups large figures', () => {
      expect(formatNumber(2024)).toBe('2024');
      expect(formatNumber('5000000')).toBe('5,000,000');
      expect(formatNumber(0.1255)).toBe('0.1255');
      expect(formatNumber(undefined)).toBe(EMPTY_VALUE);
    });

    it('renders dates in UTC regardless of the reader', () => {
      expect(formatDate('2026-01-05')).toBe('05 Jan 2026');
      expect(formatDateTime(GENERATED_AT)).toBe('12 Aug 2026 09:30 UTC');
      expect(formatDate(null)).toBe(EMPTY_VALUE);
      expect(formatDate('nonsense')).toBe(EMPTY_VALUE);
    });

    it('turns keys and enums into prose, preserving acronyms', () => {
      expect(formatLabel('sumInsured')).toBe('Sum Insured');
      expect(formatLabel('loss_ratio')).toBe('Loss Ratio');
      expect(formatLabel('pmlUSD')).toBe('Pml USD');
    });

    it('reads the document category out of the S3 key', () => {
      expect(documentCategory('submissions/abc/loss_history/uuid.pdf')).toBe('Loss History');
      expect(documentCategory('submissions/abc/not_a_category/uuid.pdf')).toBe('Other');
      expect(documentCategory(null)).toBe('Other');
      expect(formatFileSize(2_621_440)).toBe('2.5 MB');
      expect(formatFileSize(null)).toBe(EMPTY_VALUE);
    });

    it('derives a reference and a safe download name', () => {
      expect(submissionReference({ id: 'b1c2d3e4-5f60-7890' })).toBe('NXR-B1C2D3E4');
      expect(submissionReference({ id: 'x', reference: 'SLIP/2026/001' })).toBe('SLIP/2026/001');
      expect(submissionReference({})).toBe('NXR-UNKNOWN');
      expect(placementSlipFileName('SLIP/2026/001')).toBe('placement-slip-SLIP-2026-001.pdf');
    });
  });

  describe('quotes', () => {
    it('marks the accepted quote and surfaces it separately', () => {
      const model = buildPlacementSlip(
        buildInput({
          quotes: [
            {
              reinsurer: { name: 'Meridian Re' },
              quoteType: 'indication',
              status: 'declined',
              rate: '0.1250',
              premium: '310000.00',
              capacity: '15.00',
            },
            {
              reinsurer: { name: 'Atlas Reinsurance' },
              quoteType: 'firm_order',
              status: 'accepted',
              rate: '0.1100',
              premium: '275000.00',
              capacity: '40.00',
              terms: 'Subject to survey within 60 days',
            },
          ],
        }),
        { generatedAt: GENERATED_AT },
      );

      expect(model.quotes).toHaveLength(2);
      expect(model.quotes[0].accepted).toBe(false);
      expect(model.acceptedQuote).not.toBeNull();
      expect(model.acceptedQuote?.reinsurer).toBe('Atlas Reinsurance');
      expect(model.acceptedQuote?.quoteType).toBe('Firm Order');
      expect(model.acceptedQuote?.premium).toBe('USD 275,000.00');
      expect(model.acceptedQuote?.share).toBe('40%');
    });

    it('copes with a quote missing its reinsurer and optional terms', () => {
      const [row] = buildQuoteRows([{ status: 'indication', capacity: null }], null);

      expect(row.reinsurer).toBe('Undisclosed market');
      expect(row.quoteType).toBe(EMPTY_VALUE);
      expect(row.share).toBe(EMPTY_VALUE);
      expect(row.premium).toBe(EMPTY_VALUE);
      expect(row.validUntil).toBe(EMPTY_VALUE);
      expect(row.terms).toBe(EMPTY_VALUE);
      expect(row.accepted).toBe(false);
    });
  });

  describe('the whole model', () => {
    it('builds every section from a fully populated submission', () => {
      const model = buildPlacementSlip(
        buildInput({
          inceptionDate: '2026-01-01',
          expiryDate: '2026-12-31',
          submittedAt: '2026-08-01T12:00:00.000Z',
          description: 'Property damage and business interruption for two refineries.',
          riskDetails: { occupancy: 'Refinery' },
          cedant: {
            name: 'Gulf Insurance Co',
            type: 'cedant',
            country: 'AE',
            email: 'placements@gulf.example',
          },
          submittedBy: { firstName: 'Nadia', lastName: 'Haddad', email: 'nadia@gulf.example' },
          documents: [
            {
              fileName: 'survey-2026.pdf',
              fileSize: 1_048_576,
              s3Key: 'submissions/abc/risk_survey/uuid.pdf',
              createdAt: '2026-07-20T08:00:00.000Z',
            },
          ],
        }),
        { broker: { name: 'Marlin Brokers', country: 'GB' }, generatedAt: GENERATED_AT },
      );

      expect(model.header).toEqual({
        reference: 'NXR-B1C2D3E4',
        title: 'Gulf Energy Property Treaty 2026',
        type: 'Treaty',
        lineOfBusiness: 'Property',
        status: 'Under Review',
      });
      expect(model.fileName).toBe('placement-slip-NXR-B1C2D3E4.pdf');
      expect(model.summary).toContainEqual({ label: 'Sum Insured', value: 'USD 25,000,000.00' });
      expect(model.summary).toContainEqual({
        label: 'Period of Cover',
        value: '01 Jan 2026 to 31 Dec 2026',
      });
      expect(model.parties[0].rows).toContainEqual({ label: 'Contact', value: 'Nadia Haddad' });
      expect(model.parties[1].rows).toContainEqual({ label: 'Name', value: 'Marlin Brokers' });
      expect(model.documents).toEqual([
        {
          name: 'survey-2026.pdf',
          category: 'Risk Survey',
          size: '1.0 MB',
          uploaded: '20 Jul 2026',
        },
      ]);
      expect(model.footer).toEqual({
        generatedAt: '12 Aug 2026 09:30 UTC',
        generatedBy: 'Generated by NexusRe',
      });
    });

    it('stays intact when documents and quotes are empty', () => {
      const model = buildPlacementSlip(buildInput({ documents: [], quotes: [] }), {
        generatedAt: GENERATED_AT,
      });

      expect(model.documents).toEqual([]);
      expect(model.quotes).toEqual([]);
      expect(model.acceptedQuote).toBeNull();
      expect(model.riskDetails.rows).toEqual([]);
      expect(model.riskDetails.emptyMessage).toBeTruthy();
    });

    it('falls back gracefully when every optional field is missing', () => {
      const model = buildPlacementSlip({ id: 'sub-1' }, { generatedAt: GENERATED_AT });

      expect(model.header.reference).toBe('NXR-SUB1');
      expect(model.header.title).toBe('Untitled submission');
      expect(model.header.type).toBe(EMPTY_VALUE);
      expect(model.description).toBeNull();
      expect(model.parties[0].rows).toEqual([]);
      expect(model.parties[1].rows).toEqual([]);
      expect(model.parties[1].emptyMessage).toContain('no broker');
      expect(model.summary.every((row) => typeof row.value === 'string')).toBe(true);
      expect(model.summary).toContainEqual({ label: 'Sum Insured', value: EMPTY_VALUE });
    });
  });
});
