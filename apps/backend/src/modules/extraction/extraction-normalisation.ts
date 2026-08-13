import { LineOfBusiness } from '../submissions/entities/submission.entity';

/**
 * A single fact the extractor believes it found in a document, together with
 * where a human reviewer has left it.
 *
 * `value` is always the model's original reading — it is never overwritten, so
 * an audit of the extraction can always show what the machine actually said.
 * A reviewer's correction lives in `correctedValue`.
 */
export interface ExtractedField {
  /** Dot path into the submission's riskDetails, e.g. `property.constructionType`. */
  key: string;
  /** Human-readable label for the review UI. */
  label: string;
  value: string | number | boolean | null;
  /** 0-1. The model's own stated confidence, clamped. */
  confidence: number;
  /** Where in the document the value came from, as free text. */
  sourceHint?: string;
  status: FieldReviewStatus;
  correctedValue?: string | number | boolean | null;
}

export enum FieldReviewStatus {
  /** Straight from the extractor; nobody has looked at it yet. */
  SUGGESTED = 'suggested',
  ACCEPTED = 'accepted',
  /** A reviewer accepted the field but changed the value. */
  EDITED = 'edited',
  REJECTED = 'rejected',
}

/** The raw shape we ask the model for. Everything is optional and untrusted. */
export interface RawExtractedField {
  key?: unknown;
  label?: unknown;
  value?: unknown;
  confidence?: unknown;
  sourceHint?: unknown;
}

/** Fields below this are surfaced but never pre-selected for the reviewer. */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

const MAX_FIELDS = 80;
const MAX_STRING_LENGTH = 500;

/**
 * Turns whatever the model returned into fields we are willing to store.
 *
 * Model output is untrusted input: keys are normalised to a safe dot path,
 * values are coerced and length-capped, confidence is clamped to 0-1, and
 * anything without a usable key or value is dropped rather than stored as a
 * half-populated row a reviewer would have to puzzle over.
 */
export function normaliseExtractedFields(raw: unknown): ExtractedField[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const fields: ExtractedField[] = [];

  for (const item of raw) {
    if (fields.length >= MAX_FIELDS) break;
    if (!item || typeof item !== 'object') continue;

    const candidate = item as RawExtractedField;
    const key = normaliseKey(candidate.key);
    if (!key || seen.has(key)) continue;

    const value = coerceValue(candidate.value);
    if (value === null || value === '') continue;

    seen.add(key);
    fields.push({
      key,
      label: normaliseLabel(candidate.label, key),
      value,
      confidence: clampConfidence(candidate.confidence),
      sourceHint:
        typeof candidate.sourceHint === 'string'
          ? truncate(candidate.sourceHint, 200)
          : undefined,
      status: FieldReviewStatus.SUGGESTED,
    });
  }

  return fields;
}

/**
 * Restricts a key to dot-separated identifier segments, because these keys are
 * later used to build a path into a stored JSON object.
 *
 * A key containing a forbidden segment is rejected outright rather than having
 * that segment stripped: silently rewriting `__proto__.polluted` to `polluted`
 * would show the reviewer a field at a path the extractor never proposed.
 */
function normaliseKey(input: unknown): string | null {
  if (typeof input !== 'string') return null;

  const rawSegments = input.trim().split('.');
  const segments: string[] = [];

  for (const raw of rawSegments) {
    const cleaned = raw
      .replace(/[^A-Za-z0-9_ -]/g, '')
      .trim()
      .replace(/[\s-]+/g, '_');

    if (FORBIDDEN_SEGMENTS.has(cleaned) || FORBIDDEN_SEGMENTS.has(raw.trim())) return null;
    // An empty segment is a formatting artefact ("a..b", a trailing dot), not
    // an attempt at anything, so it is dropped rather than failing the key.
    if (cleaned.length > 0) segments.push(cleaned);
  }

  if (segments.length === 0 || segments.length > 4) return null;
  return segments.join('.').slice(0, 120);
}

const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function normaliseLabel(input: unknown, key: string): string {
  if (typeof input === 'string' && input.trim().length > 0) {
    return truncate(input.trim(), 120);
  }
  // Fall back to a readable version of the key rather than leaving it blank.
  const last = key.split('.').pop() ?? key;
  return last
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function coerceValue(input: unknown): string | number | boolean | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'boolean') return input;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.length === 0) return null;
    // Common "the model found nothing" placeholders, which are worse than
    // absence because they look like real answers in the review UI.
    if (/^(n\/?a|unknown|not (stated|specified|provided|found)|none|null)$/i.test(trimmed)) {
      return null;
    }
    return truncate(trimmed, MAX_STRING_LENGTH);
  }
  return null;
}

function clampConfidence(input: unknown): number {
  const n = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(n)) return 0.5;
  // Tolerate a model that answered on a 0-100 scale.
  const scaled = n > 1 ? n / 100 : n;
  return Math.max(0, Math.min(1, Number(scaled.toFixed(2))));
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/**
 * Parses a monetary figure written the way documents actually write them —
 * "USD 12,500,000", "$1.2m", "EUR 3 500 000,00" — into a plain number.
 * Returns null when there is no unambiguous figure, never a guess of 0.
 */
export function parseMonetaryValue(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (typeof input !== 'string') return null;

  const text = input.trim();
  if (text.length === 0) return null;

  const multiplier = /\b(\d[\d.,\s]*)\s*(k|m|bn|b)\b/i.exec(text);
  const numeric = multiplier ? multiplier[1] : text.replace(/[^\d.,\s]/g, '');

  const cleaned = normaliseDecimalSeparators(numeric);
  if (cleaned === null) return null;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;

  if (!multiplier) return parsed;
  const suffix = multiplier[2].toLowerCase();
  const factor = suffix === 'k' ? 1_000 : suffix === 'm' ? 1_000_000 : 1_000_000_000;
  return parsed * factor;
}

/**
 * Reconciles the two conventions (1,234.56 and 1.234,56) by treating whichever
 * separator appears last as the decimal point.
 */
function normaliseDecimalSeparators(input: string): string | null {
  const stripped = input.replace(/\s/g, '');
  if (stripped.length === 0 || !/\d/.test(stripped)) return null;

  const lastComma = stripped.lastIndexOf(',');
  const lastDot = stripped.lastIndexOf('.');

  if (lastComma === -1 && lastDot === -1) return stripped;

  if (lastComma > lastDot) {
    return stripped.replace(/\./g, '').replace(',', '.');
  }
  return stripped.replace(/,/g, '');
}

/** Three-letter ISO currency code if the text names one, else null. */
export function parseCurrency(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = /\b(USD|EUR|GBP|NGN|KES|ZAR|GHS|XOF|XAF|CHF|JPY|AED|MAD|EGP|TZS|UGX)\b/i.exec(
    input,
  );
  if (code) return code[1].toUpperCase();

  const symbol = /[$€£]/.exec(input);
  if (!symbol) return null;
  return symbol[0] === '$' ? 'USD' : symbol[0] === '€' ? 'EUR' : 'GBP';
}

/**
 * The value a reviewer settled on, or null when the field should not be
 * applied. An untouched suggestion is deliberately *not* applied — extraction
 * proposes, a human disposes.
 */
export function resolveFieldValue(field: ExtractedField): string | number | boolean | null {
  switch (field.status) {
    case FieldReviewStatus.ACCEPTED:
      return field.value;
    case FieldReviewStatus.EDITED:
      return field.correctedValue ?? null;
    default:
      return null;
  }
}

/**
 * Merges reviewer-approved fields into a submission's riskDetails.
 *
 * Returns a new object — the caller decides whether to persist — and reports
 * which keys were written so the change can be recorded in submission history.
 * Existing values are overwritten only by fields a human approved, which is the
 * whole point of the review step.
 */
export function applyFieldsToRiskDetails(
  riskDetails: Record<string, unknown> | null | undefined,
  fields: ExtractedField[],
): { riskDetails: Record<string, unknown>; appliedKeys: string[] } {
  const result: Record<string, unknown> = structuredCloneish(riskDetails ?? {});
  const appliedKeys: string[] = [];

  for (const field of fields) {
    const value = resolveFieldValue(field);
    if (value === null) continue;
    if (setByPath(result, field.key, value)) {
      appliedKeys.push(field.key);
    }
  }

  return { riskDetails: result, appliedKeys };
}

/**
 * Writes a dot path, creating intermediate objects. Refuses to descend through
 * a segment that already holds a non-object, so an approved scalar can never
 * silently destroy a populated sub-tree.
 */
function setByPath(target: Record<string, unknown>, path: string, value: unknown): boolean {
  const segments = path.split('.');
  let cursor: Record<string, unknown> = target;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (FORBIDDEN_SEGMENTS.has(segment)) return false;

    const next = cursor[segment];
    if (next === undefined || next === null) {
      cursor[segment] = {};
    } else if (typeof next !== 'object' || Array.isArray(next)) {
      return false;
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }

  const last = segments[segments.length - 1];
  if (FORBIDDEN_SEGMENTS.has(last)) return false;
  cursor[last] = value;
  return true;
}

/** structuredClone is not available on every supported Node build. */
function structuredCloneish<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * How complete an extraction looks, as a percentage of the fields we expect for
 * the line of business. Used to tell a reviewer whether the document was worth
 * reading, not to gate anything.
 */
export function extractionCoverage(
  fields: ExtractedField[],
  lineOfBusiness: LineOfBusiness,
): number {
  const expected = EXPECTED_FIELD_COUNT[lineOfBusiness] ?? DEFAULT_EXPECTED_FIELDS;
  const usable = fields.filter((f) => f.confidence >= LOW_CONFIDENCE_THRESHOLD).length;
  return Math.min(100, Math.round((usable / expected) * 100));
}

const DEFAULT_EXPECTED_FIELDS = 10;

const EXPECTED_FIELD_COUNT: Partial<Record<LineOfBusiness, number>> = {
  [LineOfBusiness.PROPERTY]: 14,
  [LineOfBusiness.ENGINEERING]: 12,
  [LineOfBusiness.ENERGY]: 16,
  [LineOfBusiness.CASUALTY]: 10,
  [LineOfBusiness.MARINE]: 12,
  [LineOfBusiness.CYBER]: 10,
};
