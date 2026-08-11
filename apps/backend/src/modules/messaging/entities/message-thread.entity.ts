import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Submission } from '../../submissions/entities/submission.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Message } from './message.entity';

/**
 * One conversation per submission per counterparty, so reinsurers bidding on the
 * same risk never see each other's correspondence.
 */
@Entity('message_threads')
export class MessageThread {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Submission, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'submissionId' })
  submission: Submission;

  @Column()
  submissionId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'cedantOrgId' })
  cedantOrg: Organization;

  @Column()
  cedantOrgId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'counterpartyOrgId' })
  counterpartyOrg: Organization;

  @Column()
  counterpartyOrgId: string;

  @Column({ nullable: true })
  subject: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @OneToMany(() => Message, (message) => message.thread)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
