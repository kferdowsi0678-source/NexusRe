import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import { LineOfBusiness, SubmissionType } from '../../submissions/entities/submission.entity';

export enum StructurePreference {
  PROPORTIONAL = 'proportional',
  NON_PROPORTIONAL = 'non_proportional',
  ANY = 'any',
}

/** A reinsurer's stated willingness to look at a class of risk. */
@Entity('risk_appetites')
export class RiskAppetite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'reinsurerId' })
  reinsurer: Organization;

  @Column()
  reinsurerId: string;

  @Column({ type: 'json' })
  linesOfBusiness: LineOfBusiness[];

  @Column({ type: 'json', nullable: true })
  submissionTypes: SubmissionType[];

  /** ISO country names as used on Organization.country. Ignored when worldwide. */
  @Column({ type: 'json', nullable: true })
  countries: string[];

  @Column({ default: false })
  worldwide: boolean;

  @Column({ type: 'enum', enum: StructurePreference, default: StructurePreference.ANY })
  structurePreference: StructurePreference;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  minSumInsured: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxSumInsured: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxCapacityShare: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
