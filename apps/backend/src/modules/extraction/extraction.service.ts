import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionDocument } from '../submissions/entities/submission-document.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { ChangeType } from '../submissions/entities/submission-history.entity';
import { SubmissionsService } from '../submissions/submissions.service';
import { StorageService } from '../storage/storage.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request';
import { RoleType } from '../users/entities/role.entity';
import {
  DocumentExtraction,
  ExtractionStatus,
} from './entities/document-extraction.entity';
import {
  DocumentIntelligenceService,
  UnsupportedDocumentError,
} from './document-intelligence.service';
import {
  ExtractedField,
  FieldReviewStatus,
  applyFieldsToRiskDetails,
  extractionCoverage,
} from './extraction-normalisation';
import { DECISION_TO_STATUS, ReviewExtractionDto } from './dto/review-extraction.dto';

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    @InjectRepository(DocumentExtraction)
    private readonly extractionRepository: Repository<DocumentExtraction>,
    @InjectRepository(SubmissionDocument)
    private readonly documentRepository: Repository<SubmissionDocument>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    private readonly storageService: StorageService,
    private readonly intelligence: DocumentIntelligenceService,
    private readonly submissionsService: SubmissionsService,
  ) {}

  /**
   * Runs an extraction over one document and returns the completed row.
   *
   * The run is persisted before the model is called, so a request that dies
   * mid-flight leaves a `processing` row that explains itself rather than
   * silently disappearing.
   */
  async extractDocument(
    submissionId: string,
    documentId: string,
    user: AuthenticatedUser,
  ): Promise<DocumentExtraction> {
    const submission = await this.loadSubmissionForUser(submissionId, user);

    const document = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!document || document.submissionId !== submissionId) {
      throw new NotFoundException('Document not found on this submission');
    }
    if (!document.s3Key) {
      throw new BadRequestException('Document has no stored file to read');
    }

    const run = await this.extractionRepository.save(
      this.extractionRepository.create({
        documentId: document.id,
        submissionId,
        status: ExtractionStatus.PROCESSING,
        requestedById: user.userId,
      }),
    );

    try {
      const content = await this.storageService.getObjectBuffer(document.s3Key);

      const outcome = await this.intelligence.extract(
        { fileName: document.fileName, mimeType: document.fileType, content },
        {
          lineOfBusiness: submission.lineOfBusiness,
          submissionType: submission.type,
          knownKeys: collectKeys(submission.riskDetails),
        },
      );

      run.status = ExtractionStatus.COMPLETED;
      run.provider = outcome.provider;
      run.model = outcome.model;
      run.fields = outcome.fields;
      run.summary = outcome.summary;
      run.coverage = extractionCoverage(outcome.fields, submission.lineOfBusiness);
      run.inputTokens = outcome.inputTokens;
      run.outputTokens = outcome.outputTokens;

      const saved = await this.extractionRepository.save(run);

      // Mark the document so the UI can show at a glance which files have been
      // read, matching the pre-existing isExtracted flag.
      document.isExtracted = true;
      document.extractedData = { extractionId: saved.id, fieldCount: outcome.fields.length };
      await this.documentRepository.save(document);

      await this.submissionsService.logHistory(
        submissionId,
        user.userId,
        ChangeType.UPDATED,
        { documentId, fieldCount: outcome.fields.length, provider: outcome.provider },
        `Extracted ${outcome.fields.length} field(s) from ${document.fileName}`,
      );

      return saved;
    } catch (error) {
      run.status =
        error instanceof UnsupportedDocumentError
          ? ExtractionStatus.UNSUPPORTED
          : ExtractionStatus.FAILED;
      run.errorMessage = error instanceof Error ? error.message : String(error);
      await this.extractionRepository.save(run);

      this.logger.error(
        `Extraction ${run.id} failed for document ${documentId}: ${run.errorMessage}`,
      );

      // An unsupported file is the caller's problem to fix; anything else is
      // recorded and surfaced without pretending the run succeeded.
      if (error instanceof UnsupportedDocumentError) {
        throw new BadRequestException(run.errorMessage);
      }
      return run;
    }
  }

  async findForSubmission(
    submissionId: string,
    user: AuthenticatedUser,
  ): Promise<DocumentExtraction[]> {
    await this.loadSubmissionForUser(submissionId, user);

    return this.extractionRepository.find({
      where: { submissionId },
      relations: ['document', 'requestedBy', 'reviewedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    submissionId: string,
    id: string,
    user: AuthenticatedUser,
  ): Promise<DocumentExtraction> {
    await this.loadSubmissionForUser(submissionId, user);

    const run = await this.extractionRepository.findOne({
      where: { id },
      relations: ['document', 'requestedBy', 'reviewedBy'],
    });
    if (!run || run.submissionId !== submissionId) {
      throw new NotFoundException('Extraction not found');
    }
    return run;
  }

  /**
   * Records a reviewer's per-field decisions. Does not touch the submission —
   * applying is a separate, explicit step so a reviewer can work through a long
   * document across several sittings before committing anything.
   */
  async review(
    submissionId: string,
    id: string,
    dto: ReviewExtractionDto,
    user: AuthenticatedUser,
  ): Promise<DocumentExtraction> {
    const run = await this.findOne(submissionId, id, user);

    if (run.status === ExtractionStatus.PROCESSING) {
      throw new BadRequestException('Extraction is still running');
    }
    const fields = run.fields ?? [];
    if (fields.length === 0) {
      throw new BadRequestException('This extraction produced no fields to review');
    }

    const byKey = new Map(fields.map((field) => [field.key, field]));
    const unknown: string[] = [];

    for (const decision of dto.decisions) {
      const field = byKey.get(decision.key);
      if (!field) {
        unknown.push(decision.key);
        continue;
      }

      const status = DECISION_TO_STATUS[decision.decision];
      if (status === FieldReviewStatus.EDITED) {
        const corrected = decision.correctedValue?.trim();
        if (!corrected) {
          throw new BadRequestException(
            `Field "${decision.key}" was marked as edited but no corrected value was given`,
          );
        }
        field.correctedValue = corrected;
      } else {
        delete field.correctedValue;
      }
      field.status = status;
    }

    if (unknown.length > 0) {
      throw new BadRequestException(
        `These fields are not part of this extraction: ${unknown.join(', ')}`,
      );
    }

    run.fields = fields;
    run.reviewedById = user.userId;
    run.reviewedAt = new Date();
    return this.extractionRepository.save(run);
  }

  /**
   * Writes the accepted and edited fields into the submission's riskDetails and
   * recomputes the completeness score. Suggestions nobody looked at are skipped,
   * so nothing reaches the submission without a human behind it.
   */
  async apply(
    submissionId: string,
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ extraction: DocumentExtraction; appliedKeys: string[]; completenessScore: number }> {
    const submission = await this.loadSubmissionForUser(submissionId, user);
    const run = await this.findOne(submissionId, id, user);

    const approved = (run.fields ?? []).filter(
      (field) =>
        field.status === FieldReviewStatus.ACCEPTED || field.status === FieldReviewStatus.EDITED,
    );

    if (approved.length === 0) {
      throw new BadRequestException(
        'No fields have been accepted. Review the extraction before applying it.',
      );
    }

    const { riskDetails, appliedKeys } = applyFieldsToRiskDetails(submission.riskDetails, approved);

    submission.riskDetails = riskDetails;
    await this.submissionRepository.save(submission);

    run.status = ExtractionStatus.REVIEWED;
    run.appliedKeys = appliedKeys;
    run.reviewedById = user.userId;
    run.reviewedAt = new Date();
    const saved = await this.extractionRepository.save(run);

    const completenessScore = await this.submissionsService.calculateCompletenessScore(
      submissionId,
    );

    await this.submissionsService.logHistory(
      submissionId,
      user.userId,
      ChangeType.UPDATED,
      { extractionId: id, appliedKeys },
      `Applied ${appliedKeys.length} reviewed field(s) from document extraction`,
    );

    return { extraction: saved, appliedKeys, completenessScore };
  }

  /**
   * Loads the submission and enforces that the caller may see it. Cedant and
   * broker staff are limited to their own organization; reinsurers and platform
   * admins are handled by the roles guard on the controller.
   */
  private async loadSubmissionForUser(
    submissionId: string,
    user: AuthenticatedUser,
  ): Promise<Submission> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const privileged = user.roles.includes(RoleType.SUPER_ADMIN);

    if (!privileged && submission.cedantId !== user.organizationId) {
      throw new ForbiddenException('This submission belongs to another organization');
    }

    return submission;
  }
}

/**
 * Flattens an existing riskDetails object into dot paths, so the model can be
 * told which fields the submission already uses instead of inventing new ones.
 */
function collectKeys(riskDetails: unknown, prefix = '', depth = 0): string[] {
  if (depth > 3 || !riskDetails || typeof riskDetails !== 'object' || Array.isArray(riskDetails)) {
    return [];
  }

  const keys: string[] = [];
  for (const [key, value] of Object.entries(riskDetails as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...collectKeys(value, path, depth + 1));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

export type { ExtractedField };
