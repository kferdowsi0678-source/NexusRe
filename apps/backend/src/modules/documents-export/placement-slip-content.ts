/**
 * The placement slip's *content* model.
 *
 * Everything here is a pure function over plain data: no repositories, no
 * pdfkit, no Nest. `placement-slip.service.ts` owns the layout and only ever
 * consumes the model built below, which keeps the interesting decisions (which
 * rows exist, how a label reads, how money and dates are written) unit-testable
 * without generating a single byte of PDF.
 */

/** Rendered in every cell whose underlying value is missing. */
export const EMPTY_VALUE = '—';

/** Values longer than this are cut so a row can never blow the page width. */
export const MAX_VALUE_LENGTH = 180;

/** How far into a nested riskDetails object the flattener will walk. */
export const MAX_DETAIL_DEPTH = 4;

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Categories are encoded in the S3 key, not stored on the document row. */
const DOCUMENT_CATEGORIES = [
  'risk_survey',
  'loss_history',
  'financials',
  'wordings',
  'claims_documentation',
  'other',
];

/** Quote statuses that mean the market has been bound to this placement. */
const ACCEPTED_QUOTE_STATUSES = ['accepted', 'bound'];

// ---------------------------------------------------------------------------
// Input shapes
//
// Deliberately structural and fully optional so the TypeORM entities satisfy
// them without the content layer having to import (or depend on) TypeORM.
// ---------------------------------------------------------------------------

export type DateLike = Date | string | number | null | undefined;
export type NumberLike = number | string | null | undefined;

export interface SlipOrganizationInput {
  name?: string | null;
  type?: string | null;
  country?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

export interface SlipUserInput {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  organization?: SlipOrganizationInput | null;
}

export interface SlipDocumentInput {
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: NumberLike;
  s3Key?: string | null;
  description?: string | null;
  createdAt?: DateLike;
}

export interface SlipQuoteInput {
  reinsurer?: SlipOrganizationInput | null;
  quoteType?: string | null;
  status?: string | null;
  rate?: NumberLike;
  premium?: NumberLike;
  capacity?: NumberLike;
  terms?: string | null;
  conditions?: string | null;
  exclusions?: string | null;
  validUntil?: DateLike;
  createdAt?: DateLike;
}

export interface SlipSubmissionInput {
  id?: string | null;
  /** Honoured when the schema eventually grows an explicit reference column. */
  reference?: string | null;
  title?: string | null;
  type?: string | null;
  lineOfBusiness?: string | null;
  status?: string | null;
  description?: string | null;
  sumInsured?: NumberLike;
  currency?: string | null;
  inceptionDate?: DateLike;
  expiryDate?: DateLike;
  riskDetails?: unknown;
  completenessScore?: NumberLike;
  cedant?: SlipOrganizationInput | null;
  submittedBy?: SlipUserInput | null;
  documents?: SlipDocumentInput[] | null;
  quotes?: SlipQuoteInput[] | null;
  submittedAt?: DateLike;
  createdAt?: DateLike;
}

export interface BuildPlacementSlipOptions {
  /**
   * Broker of record. The submission entity has no broker column, so the
   * caller resolves the organisation behind `submittedBy` and passes it in.
   */
  broker?: SlipOrganizationInput | null;
  generatedAt?: Date;
}

// ---------------------------------------------------------------------------
// Output shapes
// ---------------------------------------------------------------------------

export interface SlipRow {
  label: string;
  value: string;
}

export interface SlipSection {
  title: string;
  rows: SlipRow[];
  /** Shown instead of the rows when `rows` is empty. */
  emptyMessage?: string;
}

export interface SlipDocumentRow {
  name: string;
  category: string;
  size: string;
  uploaded: string;
}

export interface SlipQuoteRow {
  reinsurer: string;
  quoteType: string;
  status: string;
  share: string;
  premium: string;
  rate: string;
  validUntil: string;
  terms: string;
  accepted: boolean;
}

export interface PlacementSlipModel {
  /** Suggested download name, already safe for a Content-Disposition header. */
  fileName: string;
  header: {
    reference: string;
    title: string;
    type: string;
    lineOfBusiness: string;
    status: string;
  };
  description: string | null;
  summary: SlipRow[];
  parties: SlipSection[];
  riskDetails: SlipSection;
  documents: SlipDocumentRow[];
  quotes: SlipQuoteRow[];
  /** The bound market, when one of the quotes has been accepted. */
  acceptedQuote: SlipQuoteRow | null;
  footer: {
    generatedAt: string;
    generatedBy: string;
  };
}

// ---------------------------------------------------------------------------
// Primitive formatting
// ---------------------------------------------------------------------------

const isPresent = (value: unknown): boolean =>
  value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '');

/** Postgres hands DECIMAL back as a string, so every figure goes through here. */
export function toNumber(value: NumberLike): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Collapses whitespace and clips over-long text. Slips are read as documents,
 * so a truncated cell is far better than one that overruns its column.
 */
export function truncate(value: string, max: number = MAX_VALUE_LENGTH): string {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= max) return collapsed;
  return collapsed.slice(0, Math.max(0, max - 3)).trimEnd() + '...';
}

/**
 * `sumInsured` → `Sum Insured`, `loss_ratio` → `Loss Ratio`, `pmlUSD` →
 * `Pml USD`. Runs of capitals are kept intact so acronyms survive.
 */
export function formatLabel(key: string): string {
  const words = key
    .replace(/[_\-.]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(' ')
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return key;

  return words
    .map((word) =>
      word === word.toUpperCase() ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
}

/** Enum-ish values (`under_review`, `firm_offer`) read as prose on the slip. */
export function formatEnum(value: string | null | undefined): string {
  if (!isPresent(value)) return EMPTY_VALUE;
  return formatLabel(String(value));
}

/**
 * Thousands separators only where they help. Years and small counts stay bare
 * so `2024` does not turn into `2,024`.
 */
export function formatNumber(value: NumberLike): string {
  const parsed = toNumber(value);
  if (parsed === null) return EMPTY_VALUE;
  if (Number.isInteger(parsed) && Math.abs(parsed) < 10000) return String(parsed);
  return parsed.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

export function formatCurrency(value: NumberLike, currency?: string | null): string {
  const parsed = toNumber(value);
  if (parsed === null) return EMPTY_VALUE;
  const amount = parsed.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isPresent(currency) ? `${String(currency).toUpperCase()} ${amount}` : amount;
}

export function formatPercent(value: NumberLike): string {
  const parsed = toNumber(value);
  if (parsed === null) return EMPTY_VALUE;
  return `${formatNumber(parsed)}%`;
}

/** Fixed `DD Mon YYYY` in UTC — a slip must read the same wherever it is opened. */
export function formatDate(value: DateLike): string {
  const date = toDate(value);
  if (!date) return EMPTY_VALUE;
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatDateTime(value: DateLike): string {
  const date = toDate(value);
  if (!date) return EMPTY_VALUE;
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${formatDate(date)} ${hours}:${minutes} UTC`;
}

export function formatFileSize(value: NumberLike): string {
  const bytes = toNumber(value);
  if (bytes === null || bytes < 0) return EMPTY_VALUE;
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// riskDetails flattening
// ---------------------------------------------------------------------------

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Date);

function formatScalar(value: unknown): string | null {
  if (!isPresent(value)) return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return formatNumber(value);
  if (value instanceof Date) return formatDate(value);
  return truncate(String(value));
}

/**
 * Turns an arbitrarily nested `riskDetails` blob into flat label/value rows.
 * Nested keys are joined with a slash (`Property / Construction`) and empty
 * values are dropped rather than printed as blanks.
 */
export function flattenDetails(
  value: unknown,
  path: string[] = [],
  depth = 0,
): SlipRow[] {
  const label = path.length ? path.join(' / ') : '';

  if (!isPresent(value)) return [];

  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    const scalars = value.every((item) => !isPlainObject(item) && !Array.isArray(item));
    if (scalars) {
      const joined = value
        .map((item) => formatScalar(item))
        .filter((item): item is string => item !== null)
        .join(', ');
      return joined ? [{ label: label || 'Details', value: truncate(joined) }] : [];
    }
    if (depth >= MAX_DETAIL_DEPTH) {
      return [{ label: label || 'Details', value: truncate(safeStringify(value)) }];
    }
    return value.flatMap((item, index) =>
      flattenDetails(item, [...path.slice(0, -1), `${path[path.length - 1] ?? 'Item'} ${index + 1}`], depth + 1),
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(([, item]) => isPresent(item));
    if (entries.length === 0) return [];
    if (depth >= MAX_DETAIL_DEPTH) {
      return [{ label: label || 'Details', value: truncate(safeStringify(value)) }];
    }
    return entries.flatMap(([key, item]) =>
      flattenDetails(item, [...path, formatLabel(key)], depth + 1),
    );
  }

  const scalar = formatScalar(value);
  return scalar === null ? [] : [{ label: label || 'Details', value: scalar }];
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// Reference / file name
// ---------------------------------------------------------------------------

/**
 * Submissions have no reference column yet, so one is derived from the id.
 * An explicit `reference` on the record always wins.
 */
export function submissionReference(submission: SlipSubmissionInput): string {
  if (isPresent(submission.reference)) return String(submission.reference).trim();
  const id = String(submission.id ?? '').replace(/[^a-zA-Z0-9]/g, '');
  if (!id) return 'NXR-UNKNOWN';
  return `NXR-${id.slice(0, 8).toUpperCase()}`;
}

/** Strips anything a Content-Disposition filename should not carry. */
export function placementSlipFileName(reference: string): string {
  const safe = reference.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return `placement-slip-${safe || 'submission'}.pdf`;
}

/** Category lives in the S3 key: `submissions/<id>/<category>/<uuid>.<ext>`. */
export function documentCategory(s3Key: string | null | undefined): string {
  if (!isPresent(s3Key)) return formatLabel('other');
  const segment = String(s3Key).split('/')[2] ?? '';
  return DOCUMENT_CATEGORIES.includes(segment)
    ? formatLabel(segment)
    : formatLabel('other');
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

export function organizationRows(org: SlipOrganizationInput | null | undefined): SlipRow[] {
  if (!org) return [];
  const candidates: Array<[string, unknown]> = [
    ['Name', org.name],
    ['Type', isPresent(org.type) ? formatEnum(org.type) : null],
    ['Country', org.country],
    ['Address', org.address],
    ['Email', org.email],
    ['Phone', org.phone],
    ['Website', org.website],
  ];
  return candidates
    .filter(([, value]) => isPresent(value))
    .map(([label, value]) => ({ label, value: truncate(String(value)) }));
}

export function buildDocumentRows(
  documents: SlipDocumentInput[] | null | undefined,
): SlipDocumentRow[] {
  if (!documents || documents.length === 0) return [];
  return documents.map((doc) => ({
    name: isPresent(doc.fileName) ? truncate(String(doc.fileName), 60) : 'Untitled document',
    category: documentCategory(doc.s3Key),
    size: formatFileSize(doc.fileSize),
    uploaded: formatDate(doc.createdAt),
  }));
}

export function buildQuoteRows(
  quotes: SlipQuoteInput[] | null | undefined,
  currency?: string | null,
): SlipQuoteRow[] {
  if (!quotes || quotes.length === 0) return [];
  return quotes.map((quote) => ({
    reinsurer: isPresent(quote.reinsurer?.name)
      ? truncate(String(quote.reinsurer?.name), 40)
      : 'Undisclosed market',
    quoteType: formatEnum(quote.quoteType),
    status: formatEnum(quote.status),
    share: formatPercent(quote.capacity),
    premium: formatCurrency(quote.premium, currency),
    rate: quote.rate === null || quote.rate === undefined ? EMPTY_VALUE : formatNumber(quote.rate),
    validUntil: formatDate(quote.validUntil),
    terms: isPresent(quote.terms) ? truncate(String(quote.terms)) : EMPTY_VALUE,
    accepted: ACCEPTED_QUOTE_STATUSES.includes(String(quote.status ?? '').toLowerCase()),
  }));
}

function buildSummaryRows(submission: SlipSubmissionInput): SlipRow[] {
  const inception = formatDate(submission.inceptionDate);
  const expiry = formatDate(submission.expiryDate);
  const period =
    inception === EMPTY_VALUE && expiry === EMPTY_VALUE
      ? EMPTY_VALUE
      : `${inception} to ${expiry}`;

  const completeness = toNumber(submission.completenessScore);

  return [
    { label: 'Sum Insured', value: formatCurrency(submission.sumInsured, submission.currency) },
    { label: 'Currency', value: isPresent(submission.currency) ? String(submission.currency).toUpperCase() : EMPTY_VALUE },
    { label: 'Period of Cover', value: period },
    { label: 'Submitted', value: formatDateTime(submission.submittedAt) },
    { label: 'Created', value: formatDateTime(submission.createdAt) },
    {
      label: 'Completeness',
      value: completeness === null ? EMPTY_VALUE : `${Math.round(completeness)}%`,
    },
  ];
}

function contactRows(user: SlipUserInput | null | undefined): SlipRow[] {
  if (!user) return [];
  const name = [user.firstName, user.lastName].filter((part) => isPresent(part)).join(' ');
  const rows: SlipRow[] = [];
  if (name) rows.push({ label: 'Contact', value: truncate(name) });
  if (isPresent(user.email)) rows.push({ label: 'Contact Email', value: truncate(String(user.email)) });
  return rows;
}

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

/**
 * Builds the whole document model. Nothing downstream should have to reach
 * back into the submission entity.
 */
export function buildPlacementSlip(
  submission: SlipSubmissionInput,
  options: BuildPlacementSlipOptions = {},
): PlacementSlipModel {
  const reference = submissionReference(submission);
  const generatedAt = options.generatedAt ?? new Date();

  const cedantRows = organizationRows(submission.cedant);
  const brokerRows = organizationRows(options.broker);
  const quotes = buildQuoteRows(submission.quotes, submission.currency);

  return {
    fileName: placementSlipFileName(reference),
    header: {
      reference,
      title: isPresent(submission.title) ? truncate(String(submission.title), 120) : 'Untitled submission',
      type: formatEnum(submission.type),
      lineOfBusiness: formatEnum(submission.lineOfBusiness),
      status: formatEnum(submission.status),
    },
    description: isPresent(submission.description)
      ? truncate(String(submission.description), 600)
      : null,
    summary: buildSummaryRows(submission),
    parties: [
      {
        title: 'Cedant',
        rows: [...cedantRows, ...contactRows(submission.submittedBy)],
        emptyMessage: 'No cedant details recorded.',
      },
      {
        title: 'Broker',
        rows: brokerRows,
        emptyMessage: 'Placed direct — no broker of record.',
      },
    ],
    riskDetails: {
      title: 'Risk Details',
      rows: flattenDetails(submission.riskDetails),
      emptyMessage: 'No risk details captured for this submission.',
    },
    documents: buildDocumentRows(submission.documents),
    quotes,
    acceptedQuote: quotes.find((quote) => quote.accepted) ?? null,
    footer: {
      generatedAt: formatDateTime(generatedAt),
      generatedBy: 'Generated by NexusRe',
    },
  };
}
