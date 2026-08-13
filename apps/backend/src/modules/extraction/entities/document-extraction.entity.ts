import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SubmissionDocument } from '../../submissions/entities/submission-document.entity';
import { Submission } from '../../submissions/entities/submission.entity';
import { User } from '../../users/entities/user.entity';
import { ExtractedField } from '../extraction-normalisation';

export enum ExtractionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  /** The extractor finished; fields are awaiting human review. */
  COMPLETED = 'completed',
  /** A reviewer has been through the fields and applied their decisions. */
  REVIEWED = 'reviewed',
  FAILED = 'failed',
  /** The file type cannot be read by the extractor at all. */
  UNSUPPORTED = 'unsupported',
}

export enum ExtractionProvider {
  ANTHROPIC = 'anthropic',
  /** Deterministic local parsing, used when no model API key is configured. */
  HEURISTIC = 'heuristic',
}

/**
 * One extraction run over one document.
 *
 * Runs are kept rather than replaced: re-extracting a document after a model or
 * prompt change leaves the previous run intact, so the trail of what was
 * suggested, by which provider, and what a reviewer did with it stays readable.
 */
@Entity('document_extractions')
@Index(['submissionId', 'createdAt'])
export class DocumentExtraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SubmissionDocument, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document: SubmissionDocument;

  @Column()
  @Index()
  documentId: string;

  @ManyToOne(() => Submission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submissionId' })
  submission: Submission;

  @Column()
  submissionId: string;

  @Column({ type: 'enum', enum: ExtractionStatus, default: ExtractionStatus.PENDING })
  status: ExtractionStatus;

  @Column({ type: 'enum', enum: ExtractionProvider, nullable: true })
  provider: ExtractionProvider;

  /** Model identifier, recorded so a run can be reproduced or explained later. */
  @Column({ nullable: true })
  model?: string;

  @Column({ type: 'json', nullable: true })
  fields: ExtractedField[];

  /** Prose summary of the document for a reviewer skimming the risk. */
  @Column({ type: 'text', nullable: true })
  summary: string;

  /** Percentage of the fields expected for this line of business. */
  @Column({ type: 'int', default: 0 })
  coverage: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', nullable: true })
  inputTokens?: number;

  @Column({ type: 'int', nullable: true })
  outputTokens?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'requestedById' })
  requestedBy: User;

  @Column({ nullable: true })
  requestedById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy: User;

  @Column({ nullable: true })
  reviewedById: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  /** Keys written into the submission's riskDetails when the review was applied. */
  @Column({ type: 'json', nullable: true })
  appliedKeys: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
