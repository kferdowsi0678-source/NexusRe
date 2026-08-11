import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
}

export enum AuditResource {
  USER = 'user',
  ORGANIZATION = 'organization',
  SUBMISSION = 'submission',
  QUOTE = 'quote',
  DOCUMENT = 'document',
  FORM_SCHEMA = 'form_schema',
  RISK_APPETITE = 'risk_appetite',
  MESSAGE = 'message',
  NOTIFICATION = 'notification',
}

/**
 * Immutable audit trail. Every state-changing operation leaves a record here
 * with who did what to which resource, when, and from where.
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'enum', enum: AuditResource })
  resourceType: AuditResource;

  @Column()
  resourceId: string;

  /** User who triggered the action, null for anonymous (e.g. failed login). */
  @Column({ nullable: true })
  actorId: string;

  /** Organization context, when available. */
  @Column({ nullable: true })
  organizationId: string;

  /** Snapshot before the change, for updates and deletes. */
  @Column({ type: 'json', nullable: true })
  before: any;

  /** Snapshot after the change, for creates and updates. */
  @Column({ type: 'json', nullable: true })
  after: any;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  /** Additional metadata, e.g. failure reason for login_failed. */
  @Column({ type: 'json', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
