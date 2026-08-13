import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { LineOfBusiness } from '../submissions/entities/submission.entity';
import { ExtractionProvider } from './entities/document-extraction.entity';
import {
  ExtractedField,
  normaliseExtractedFields,
  parseCurrency,
  parseMonetaryValue,
} from './extraction-normalisation';

export interface DocumentPayload {
  fileName: string;
  mimeType: string;
  content: Buffer;
}

export interface ExtractionContext {
  lineOfBusiness: LineOfBusiness;
  submissionType: string;
  /** Existing riskDetails keys, so the model proposes paths that already exist. */
  knownKeys: string[];
}

export interface ExtractionOutcome {
  provider: ExtractionProvider;
  model?: string;
  fields: ExtractedField[];
  summary: string;
  inputTokens?: number;
  outputTokens?: number;
}

/** Raised when the document is a type the extractor cannot read at all. */
export class UnsupportedDocumentError extends Error {}

/** The JSON contract the model must satisfy. Enforced server-side by the API. */
const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description:
        'A factual two-to-four sentence summary of the risk described by this document.',
    },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description:
              'Dot path for the value, lowercase snake_case segments, at most 3 levels, e.g. property.construction_type',
          },
          label: { type: 'string', description: 'Short human-readable field name.' },
          value: { type: 'string', description: 'The value exactly as stated in the document.' },
          confidence: {
            type: 'number',
            description: 'Between 0 and 1. How certain you are this value is correct.',
          },
          sourceHint: {
            type: 'string',
            description: 'Where in the document this was found, e.g. "page 2, schedule of values".',
          },
        },
        required: ['key', 'label', 'value', 'confidence', 'sourceHint'],
        additionalProperties: false,
      },
    },
  },
  required: ['summary', 'fields'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = [
  'You extract structured risk data from non-life reinsurance submission documents',
  '(risk surveys, schedules of values, loss histories, financial statements, slips).',
  '',
  'Extract only what the document actually states. If a value is not in the document, omit',
  'the field entirely rather than inferring it — a missing field costs an underwriter nothing,',
  'an invented one costs them a mispriced risk. Give a lower confidence when a value is',
  'implied, ambiguous, handwritten, or partly illegible.',
  '',
  'Record monetary amounts with their currency as written. Record dates as they appear.',
  'Prefer the dot paths you are given over inventing new ones.',
].join('\n');

/** Anthropic PDF input limits; larger files are rejected before the API call. */
const MAX_DOCUMENT_BYTES = 30 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_TEXT_TYPES = ['text/plain', 'text/csv', 'application/json', 'text/markdown'];

/**
 * Reads a document and proposes structured risk fields.
 *
 * Degrades rather than fails: with no `ANTHROPIC_API_KEY` configured, or when
 * the model call errors, it falls back to deterministic local parsing so the
 * review workflow still has something to show. The provider is recorded on
 * every run, so a reviewer can always tell which of the two produced a field.
 */
@Injectable()
export class DocumentIntelligenceService {
  private readonly logger = new Logger(DocumentIntelligenceService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.model = this.configService.get<string>('ANTHROPIC_MODEL') ?? 'claude-opus-5';
    this.client = apiKey ? new Anthropic({ apiKey }) : null;

    if (!this.client) {
      this.logger.warn(
        'ANTHROPIC_API_KEY is not set — document extraction will use local heuristics only.',
      );
    }
  }

  get isModelBacked(): boolean {
    return this.client !== null;
  }

  async extract(
    document: DocumentPayload,
    context: ExtractionContext,
  ): Promise<ExtractionOutcome> {
    if (!this.isReadable(document.mimeType)) {
      throw new UnsupportedDocumentError(
        `${document.mimeType} cannot be read by the extractor. Convert it to PDF and re-upload.`,
      );
    }

    if (document.content.byteLength > MAX_DOCUMENT_BYTES) {
      throw new UnsupportedDocumentError(
        `Document is ${Math.round(document.content.byteLength / 1024 / 1024)}MB; the extractor accepts up to 30MB.`,
      );
    }

    if (!this.client) {
      return this.heuristicExtract(document);
    }

    try {
      return await this.modelExtract(this.client, document, context);
    } catch (error) {
      // A model outage must not block the submission workflow — fall back and
      // let the reviewer see the (weaker) local reading with the provider named.
      this.logger.error(
        `Model extraction failed for ${document.fileName}: ${describeError(error)}`,
      );
      return this.heuristicExtract(document);
    }
  }

  isReadable(mimeType: string): boolean {
    return (
      mimeType === 'application/pdf' ||
      SUPPORTED_IMAGE_TYPES.includes(mimeType) ||
      SUPPORTED_TEXT_TYPES.includes(mimeType)
    );
  }

  private async modelExtract(
    client: Anthropic,
    document: DocumentPayload,
    context: ExtractionContext,
  ): Promise<ExtractionOutcome> {
    const response = await client.messages.create({
      model: this.model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: EXTRACTION_SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            ...this.buildDocumentBlocks(document),
            { type: 'text', text: this.buildInstruction(context) },
          ],
        },
      ],
    } as Anthropic.MessageCreateParamsNonStreaming);

    // Safety classifiers can decline a request; content is empty or partial in
    // that case, so this must be checked before reading any block.
    if (response.stop_reason === 'refusal') {
      throw new Error('The model declined to process this document.');
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const parsed = safeParseJson(text);

    return {
      provider: ExtractionProvider.ANTHROPIC,
      model: response.model ?? this.model,
      fields: normaliseExtractedFields(parsed?.fields),
      summary: typeof parsed?.summary === 'string' ? parsed.summary : '',
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    };
  }

  private buildDocumentBlocks(document: DocumentPayload): Anthropic.ContentBlockParam[] {
    if (document.mimeType === 'application/pdf') {
      return [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: document.content.toString('base64'),
          },
        },
      ];
    }

    if (SUPPORTED_IMAGE_TYPES.includes(document.mimeType)) {
      return [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: document.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: document.content.toString('base64'),
          },
        },
      ];
    }

    return [
      {
        type: 'text',
        text: `<document name="${document.fileName}">\n${document.content.toString('utf8')}\n</document>`,
      },
    ];
  }

  private buildInstruction(context: ExtractionContext): string {
    const lines = [
      `This document supports a ${context.submissionType} submission for ` +
        `${String(context.lineOfBusiness).replace(/_/g, ' ')} business.`,
      '',
      'Extract every risk fact it states: sums insured and their currency, locations and',
      'territories, occupancy and construction, protections, periods of cover, deductibles and',
      'limits, and any loss history with dates and amounts.',
    ];

    if (context.knownKeys.length > 0) {
      lines.push(
        '',
        'Where a fact fits one of these existing fields, reuse its exact path:',
        context.knownKeys.slice(0, 60).join(', '),
      );
    }

    return lines.join('\n');
  }

  /**
   * Deterministic fallback. Reads only what a regular expression can defend:
   * labelled monetary amounts and a handful of standard headings from text
   * documents. Everything it produces is marked low-confidence, because a
   * reviewer should treat it as a prompt to read the document, not as an answer.
   */
  private heuristicExtract(document: DocumentPayload): ExtractionOutcome {
    if (!SUPPORTED_TEXT_TYPES.includes(document.mimeType)) {
      return {
        provider: ExtractionProvider.HEURISTIC,
        fields: [],
        summary:
          'No extraction model is configured, and this file type cannot be read without one. ' +
          'Set ANTHROPIC_API_KEY to enable document extraction.',
      };
    }

    const text = document.content.toString('utf8').slice(0, 200_000);
    const raw: Array<Record<string, unknown>> = [];

    for (const [label, pattern] of HEURISTIC_PATTERNS) {
      const match = pattern.exec(text);
      if (!match) continue;

      const value = match[1]?.trim();
      if (!value) continue;

      const amount = parseMonetaryValue(value);
      raw.push({
        key: label.key,
        label: label.label,
        value: amount ?? value,
        confidence: 0.4,
        sourceHint: `Matched "${label.label}" in ${document.fileName}`,
      });

      const currency = parseCurrency(value);
      if (currency && label.currencyKey) {
        raw.push({
          key: label.currencyKey,
          label: `${label.label} currency`,
          value: currency,
          confidence: 0.4,
          sourceHint: `Matched "${label.label}" in ${document.fileName}`,
        });
      }
    }

    return {
      provider: ExtractionProvider.HEURISTIC,
      fields: normaliseExtractedFields(raw),
      summary:
        'Extracted locally without a model. Treat every field below as a hint and verify it ' +
        'against the document before accepting.',
    };
  }
}

interface HeuristicLabel {
  key: string;
  label: string;
  currencyKey?: string;
}

const HEURISTIC_PATTERNS: Array<[HeuristicLabel, RegExp]> = [
  [
    { key: 'sum_insured', label: 'Sum insured', currencyKey: 'currency' },
    /sum\s+insured\s*[:\-]?\s*([^\n\r]{1,60})/i,
  ],
  [
    { key: 'total_insured_value', label: 'Total insured value', currencyKey: 'currency' },
    /total\s+insured\s+value\s*[:\-]?\s*([^\n\r]{1,60})/i,
  ],
  [{ key: 'insured_name', label: 'Insured name' }, /insured\s*(?:name)?\s*[:\-]\s*([^\n\r]{1,80})/i],
  [{ key: 'location', label: 'Location' }, /location\s*[:\-]\s*([^\n\r]{1,80})/i],
  [{ key: 'occupancy', label: 'Occupancy' }, /occupancy\s*[:\-]\s*([^\n\r]{1,80})/i],
  [
    { key: 'construction_type', label: 'Construction' },
    /construction\s*(?:type)?\s*[:\-]\s*([^\n\r]{1,80})/i,
  ],
  [{ key: 'period.inception', label: 'Inception date' }, /inception\s*[:\-]\s*([^\n\r]{1,40})/i],
  [{ key: 'period.expiry', label: 'Expiry date' }, /expiry\s*[:\-]\s*([^\n\r]{1,40})/i],
  [
    { key: 'deductible', label: 'Deductible', currencyKey: 'deductible_currency' },
    /deductible\s*[:\-]\s*([^\n\r]{1,60})/i,
  ],
];

function safeParseJson(text: string): { summary?: unknown; fields?: unknown } | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as { summary?: unknown; fields?: unknown };
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
