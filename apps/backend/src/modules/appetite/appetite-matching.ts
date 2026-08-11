import { RiskAppetite } from './entities/risk-appetite.entity';
import { LineOfBusiness, SubmissionType } from '../submissions/entities/submission.entity';

/** Only the submission facts that bear on matching. */
export interface MatchableSubmission {
  lineOfBusiness: LineOfBusiness;
  type: SubmissionType;
  sumInsured?: number | null;
  /** Territory of the risk. Falls back to the cedant's country. */
  country?: string | null;
}

export interface AppetiteMatch {
  eligible: boolean;
  score: number;
  reasons: string[];
}

const LOB_WEIGHT = 50;
const GEO_EXACT = 20;
const GEO_WORLDWIDE = 15;
const GEO_UNKNOWN = 5;
const BAND_WITHIN = 30;
const BAND_BELOW_PENALTY = 10;
const BAND_ABOVE_PENALTY = 15;

/**
 * Rule-based, deterministic, and free of I/O so it can be tested directly.
 *
 * Line of business is a hard gate: a reinsurer that does not write the class is
 * never a match. Geography is hard only when the appetite names countries and
 * the risk's territory is known to be outside them. Sum insured is always soft,
 * because a reinsurer outside its stated band may still take a smaller share.
 */
export function matchAppetite(
  submission: MatchableSubmission,
  appetite: RiskAppetite,
): AppetiteMatch {
  const reasons: string[] = [];

  if (!appetite.isActive) {
    return { eligible: false, score: 0, reasons: ['Appetite is not active'] };
  }

  const lines = appetite.linesOfBusiness ?? [];
  if (!lines.includes(submission.lineOfBusiness)) {
    return {
      eligible: false,
      score: 0,
      reasons: [`Does not write ${String(submission.lineOfBusiness).replace(/_/g, ' ')}`],
    };
  }
  let score = LOB_WEIGHT;
  reasons.push(`Writes ${String(submission.lineOfBusiness).replace(/_/g, ' ')}`);

  const types = appetite.submissionTypes ?? [];
  if (types.length && !types.includes(submission.type)) {
    return {
      eligible: false,
      score: 0,
      reasons: [...reasons, `Does not write ${submission.type} business`],
    };
  }

  // --- Geography ---
  const countries = appetite.countries ?? [];
  if (appetite.worldwide) {
    score += GEO_WORLDWIDE;
    reasons.push('Worldwide appetite');
  } else if (!submission.country) {
    score += GEO_UNKNOWN;
    reasons.push('Territory unknown, geography unconfirmed');
  } else if (countries.some((c) => c.toLowerCase() === submission.country!.toLowerCase())) {
    score += GEO_EXACT;
    reasons.push(`Covers ${submission.country}`);
  } else if (countries.length) {
    return {
      eligible: false,
      score: 0,
      reasons: [...reasons, `Does not cover ${submission.country}`],
    };
  } else {
    score += GEO_UNKNOWN;
    reasons.push('No territory restriction stated');
  }

  // --- Sum insured band, soft in both directions ---
  const sum = submission.sumInsured ?? null;
  const min = appetite.minSumInsured != null ? Number(appetite.minSumInsured) : null;
  const max = appetite.maxSumInsured != null ? Number(appetite.maxSumInsured) : null;

  if (sum == null) {
    reasons.push('Sum insured not stated');
  } else if (min != null && sum < min) {
    score -= BAND_BELOW_PENALTY;
    reasons.push('Below their usual minimum');
  } else if (max != null && sum > max) {
    score -= BAND_ABOVE_PENALTY;
    reasons.push('Above their usual maximum, may take a share');
  } else if (min != null || max != null) {
    score += BAND_WITHIN;
    reasons.push('Within their stated band');
  }

  return { eligible: true, score: Math.max(0, Math.min(100, score)), reasons };
}

/** Highest score first; ties broken by name so ordering is stable. */
export function rankMatches<T extends { score: number; reinsurerName: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    b.score - a.score || a.reinsurerName.localeCompare(b.reinsurerName),
  );
}
