import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AiAssessment, MAX_ADJUSTMENT, RankableMatch } from './appetite-ai-ranking';
import { MatchableSubmission } from './appetite-matching';

/** Only the top candidates are sent to the model; the tail rarely gets placed. */
const MAX_CANDIDATES = 15;

const ASSESSMENT_SCHEMA = {
  type: 'object',
  properties: {
    assessments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          appetiteId: {
            type: 'string',
            description: 'Must be one of the appetite ids given in the candidate list.',
          },
          adjustment: {
            type: 'integer',
            description:
              `Between -${MAX_ADJUSTMENT} and ${MAX_ADJUSTMENT}. Positive if this market is a ` +
              'better fit than its rule score suggests, negative if worse.',
          },
          rationale: {
            type: 'string',
            description:
              'One sentence a broker could say to a client explaining the fit. Reference only ' +
              'facts present in the candidate data.',
          },
        },
        required: ['appetiteId', 'adjustment', 'rationale'],
        additionalProperties: false,
      },
    },
  },
  required: ['assessments'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = [
  'You advise a reinsurance placement platform on which markets to approach for a risk.',
  '',
  'A rule engine has already filtered out every market that cannot write this business and',
  'scored the rest. Your job is to re-order what remains and explain each fit in one sentence.',
  '',
  'Judge on: how central the risk is to the market\'s stated appetite rather than merely',
  'permitted; whether the capacity offered is meaningful against the sum insured; and how well',
  'the territory fits. Move a market only when you can point at a reason in the data you were',
  `given — adjustments are capped at ±${MAX_ADJUSTMENT} points, so use the full range sparingly.`,
  '',
  'Never suggest a market that is not in the candidate list. Do not invent capacity figures,',
  'ratings, or past relationships that were not provided.',
].join('\n');

/**
 * Asks Claude to re-rank rule-eligible markets and write a rationale for each.
 *
 * Returns an empty list — never throws — when no API key is configured or the
 * call fails, so market matching stays fully functional on rules alone.
 */
@Injectable()
export class MarketIntelligenceService {
  private readonly logger = new Logger(MarketIntelligenceService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.model = this.configService.get<string>('ANTHROPIC_MODEL') ?? 'claude-opus-5';
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  get isAvailable(): boolean {
    return this.client !== null;
  }

  async assess(
    submission: MatchableSubmission & { title?: string; description?: string | null },
    candidates: Array<RankableMatch & { maxCapacityShare?: number | null }>,
  ): Promise<AiAssessment[]> {
    if (!this.client || candidates.length === 0) return [];

    const shortlist = candidates.slice(0, MAX_CANDIDATES);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        output_config: { format: { type: 'json_schema', schema: ASSESSMENT_SCHEMA } },
        messages: [
          {
            role: 'user',
            content: this.buildPrompt(submission, shortlist),
          },
        ],
      } as Anthropic.MessageCreateParamsNonStreaming);

      if (response.stop_reason === 'refusal') {
        this.logger.warn('Model declined to assess market matches; falling back to rules only.');
        return [];
      }

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const parsed = safeParse(text);
      return Array.isArray(parsed?.assessments) ? (parsed.assessments as AiAssessment[]) : [];
    } catch (error) {
      this.logger.error(
        `Market assessment failed, continuing with rule ranking: ${describeError(error)}`,
      );
      return [];
    }
  }

  private buildPrompt(
    submission: MatchableSubmission & { title?: string; description?: string | null },
    candidates: Array<RankableMatch & { maxCapacityShare?: number | null }>,
  ): string {
    const risk = [
      '<risk>',
      `title: ${submission.title ?? 'not stated'}`,
      `line of business: ${String(submission.lineOfBusiness).replace(/_/g, ' ')}`,
      `contract type: ${submission.type}`,
      `sum insured: ${submission.sumInsured ?? 'not stated'}`,
      `territory: ${submission.country ?? 'not stated'}`,
      `description: ${submission.description ?? 'not stated'}`,
      '</risk>',
    ].join('\n');

    const list = candidates
      .map((candidate) =>
        [
          '  <candidate>',
          `    appetiteId: ${candidate.appetiteId}`,
          `    reinsurer: ${candidate.reinsurerName}`,
          `    rule score: ${candidate.score}`,
          `    max capacity share: ${candidate.maxCapacityShare ?? 'not stated'}`,
          `    rule reasons: ${candidate.reasons.join('; ')}`,
          '  </candidate>',
        ].join('\n'),
      )
      .join('\n');

    return `${risk}\n\n<candidates>\n${list}\n</candidates>\n\nReturn one assessment per candidate.`;
  }
}

function safeParse(text: string): { assessments?: unknown } | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as { assessments?: unknown };
  } catch {
    return null;
  }
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    return `${error.status ?? 'unknown status'} ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}
