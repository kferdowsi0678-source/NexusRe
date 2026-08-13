/**
 * The AI layer over rule-based appetite matching.
 *
 * The rules decide *eligibility*; the model only ever re-orders and explains
 * the markets the rules already allowed. That split is deliberate: a stated
 * exclusion is a contractual fact, and no amount of model confidence should be
 * able to put a reinsurer in front of a risk it told us it does not write.
 */

/** The rule-engine output this layer takes as its input. */
export interface RankableMatch {
  appetiteId: string;
  reinsurerName: string;
  score: number;
  reasons: string[];
}

/** One model opinion about one candidate. */
export interface AiAssessment {
  appetiteId: string;
  /** Points to add to or take off the rule score. Clamped to ±MAX_ADJUSTMENT. */
  adjustment: number;
  /** One sentence a broker could read out to a client. */
  rationale: string;
}

export interface BlendedMatch extends RankableMatch {
  /** The rule score before any model input, always preserved for audit. */
  ruleScore: number;
  /** Rule score plus the clamped model adjustment, 0-100. */
  combinedScore: number;
  aiAdjustment: number;
  aiRationale?: string;
  /** False when the model said nothing about this candidate. */
  aiApplied: boolean;
}

/**
 * How far the model may move a candidate. Small on purpose: enough to break a
 * tie or push a well-suited market up a few places, not enough to invert a
 * ranking the rules were confident about.
 */
export const MAX_ADJUSTMENT = 20;

const MAX_RATIONALE_LENGTH = 400;

/**
 * Merges model assessments into rule matches.
 *
 * Assessments for candidates that are not in `rows` are ignored rather than
 * trusted — the model is answering about a list we gave it, and anything else
 * it names is a hallucination we should not surface to an underwriter.
 */
export function blendAiAssessments(
  rows: RankableMatch[],
  assessments: AiAssessment[],
): BlendedMatch[] {
  const byId = new Map<string, AiAssessment>();
  for (const assessment of assessments) {
    if (!assessment || typeof assessment.appetiteId !== 'string') continue;
    if (!byId.has(assessment.appetiteId)) byId.set(assessment.appetiteId, assessment);
  }

  return rows.map((row) => {
    const assessment = byId.get(row.appetiteId);
    if (!assessment) {
      return {
        ...row,
        ruleScore: row.score,
        combinedScore: row.score,
        aiAdjustment: 0,
        aiApplied: false,
      };
    }

    const adjustment = clampAdjustment(assessment.adjustment);
    const rationale = normaliseRationale(assessment.rationale);

    return {
      ...row,
      ruleScore: row.score,
      combinedScore: clampScore(row.score + adjustment),
      aiAdjustment: adjustment,
      aiRationale: rationale,
      // An assessment that neither moved the score nor explained anything is
      // not worth badging as AI-assisted in the UI.
      aiApplied: adjustment !== 0 || rationale !== undefined,
    };
  });
}

/** Highest combined score first; ties broken by name so ordering is stable. */
export function rankBlendedMatches(rows: BlendedMatch[]): BlendedMatch[] {
  return [...rows].sort(
    (a, b) =>
      b.combinedScore - a.combinedScore ||
      b.ruleScore - a.ruleScore ||
      a.reinsurerName.localeCompare(b.reinsurerName),
  );
}

/**
 * Rows with no model input at all, shaped identically to a blended result so
 * callers never branch on whether AI ran.
 */
export function withoutAi(rows: RankableMatch[]): BlendedMatch[] {
  return blendAiAssessments(rows, []);
}

function clampAdjustment(input: unknown): number {
  const n = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, Math.round(n)));
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normaliseRationale(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const trimmed = input.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.length > MAX_RATIONALE_LENGTH
    ? `${trimmed.slice(0, MAX_RATIONALE_LENGTH - 1)}…`
    : trimmed;
}
