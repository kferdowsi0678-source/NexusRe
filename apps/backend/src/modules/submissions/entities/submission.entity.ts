import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { SubmissionDocument } from './submission-document.entity';
import { Quote } from './quote.entity';

export enum SubmissionType {
  TREATY = 'treaty',
  FACULTATIVE = 'facultative',
}

export enum SubmissionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  QUOTED = 'quoted',
  NEGOTIATING = 'negotiating',
  BOUND = 'bound',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

export enum LineOfBusiness {
  PROPERTY = 'property',
  CASUALTY = 'casualty',
  ENERGY = 'energy',
  MARINE = 'marine',
  AVIATION = 'aviation',
  CYBER = 'cyber',
  POLITICAL_VIOLENCE = 'political_violence',
  AGRICULTURE = 'agriculture',
  ENGINEERING = 'engineering',
  PROFESSIONAL_INDEMNITY = 'professional_indemnity',
  MOTOR = 'motor',
  LIABILITY = 'liability',
}

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: SubmissionType })
  type: SubmissionType;

  @Column({ type: 'enum', enum: LineOfBusiness })
  lineOfBusiness: LineOfBusiness;

  @Column({ type: 'enum', enum: SubmissionStatus, default: SubmissionStatus.DRAFT })
  status: SubmissionStatus;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  sumInsured: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ type: 'date', nullable: true })
  inceptionDate: Date;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ type: 'json', nullable: true })
  riskDetails: any;

  @Column({ type: 'json', nullable: true })
  lossHistory: any;

  @Column({ type: 'int', default: 0 })
  completenessScore: number;

  @ManyToOne(() => Organization, { nullable: false })
  @JoinColumn({ name: 'cedantId' })
  cedant: Organization;

  @Column()
  cedantId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'submittedById' })
  submittedBy: User;

  @Column()
  submittedById: string;

  @OneToMany(() => SubmissionDocument, (doc) => doc.submission, { cascade: true })
  documents: SubmissionDocument[];

  @OneToMany(() => Quote, (quote) => quote.submission)
  quotes: Quote[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;
}
