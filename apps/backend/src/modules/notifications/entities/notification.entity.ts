import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  QUOTE_RECEIVED = 'quote_received',
  QUOTE_STATUS_CHANGED = 'quote_status_changed',
  MESSAGE_RECEIVED = 'message_received',
  SUBMISSION_STATUS_CHANGED = 'submission_status_changed',
}

/** In-app only. Email delivery is deliberately out of scope for now. */
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  /** Deep-link payload, e.g. { submissionId, quoteId }. */
  @Column({ type: 'json', nullable: true })
  data: any;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
