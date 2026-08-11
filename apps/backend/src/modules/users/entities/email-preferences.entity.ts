import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('email_preferences')
export class EmailPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ default: true })
  quoteReceived: boolean;

  @Column({ default: true })
  quoteStatusChanged: boolean;

  @Column({ default: true })
  messageReceived: boolean;

  @Column({ default: false })
  submissionStatusChanged: boolean;

  @Column({ default: false })
  weeklyDigest: boolean;
}
