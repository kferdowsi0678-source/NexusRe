import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Submission, SubmissionStatus } from './submission.entity';
import { User } from '../../users/entities/user.entity';

export enum ChangeType {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  DOCUMENT_ADDED = 'document_added',
  DOCUMENT_REMOVED = 'document_removed',
  SUBMITTED = 'submitted',
}

@Entity('submission_history')
export class SubmissionHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Submission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'submissionId' })
  submission: Submission;

  @Column()
  submissionId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ChangeType })
  changeType: ChangeType;

  @Column({ type: 'json', nullable: true })
  changes: any;

  @Column({ type: 'json', nullable: true })
  snapshot: any;

  @Column({ nullable: true })
  oldStatus: string;

  @Column({ nullable: true })
  newStatus: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;
}