import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Submission } from './submission.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';

export enum QuoteStatus {
  INDICATION = 'indication',
  FIRM_OFFER = 'firm_offer',
  DECLINED = 'declined',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
}

@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Submission, (submission) => submission.quotes)
  @JoinColumn({ name: 'submissionId' })
  submission: Submission;

  @Column()
  submissionId: string;

  @ManyToOne(() => Organization, { nullable: false })
  @JoinColumn({ name: 'reinsurerId' })
  reinsurer: Organization;

  @Column()
  reinsurerId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'submittedById' })
  submittedBy: User;

  @Column()
  submittedById: string;

  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.INDICATION })
  status: QuoteStatus;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  rate: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  premium: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  capacity: number;

  @Column({ type: 'text', nullable: true })
  terms: string;

  @Column({ type: 'text', nullable: true })
  conditions: string;

  @Column({ type: 'text', nullable: true })
  exclusions: string;

  @Column({ type: 'date', nullable: true })
  validUntil: Date;

  @Column({ type: 'json', nullable: true })
  additionalInfo: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
