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
import { User } from '../../users/entities/user.entity';

@Entity('submission_documents')
export class SubmissionDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string;

  @Column()
  fileType: string;

  @Column()
  fileSize: number;

  @Column()
  fileUrl: string;

  @Column({ nullable: true })
  s3Key: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: false })
  isExtracted: boolean;

  @Column({ type: 'json', nullable: true })
  extractedData: any;

  @ManyToOne(() => Submission, (submission) => submission.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'submissionId' })
  submission: Submission;

  @Column()
  submissionId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @Column()
  uploadedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
