import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction, AuditLog, AuditResource } from './entities/audit-log.entity';

export interface LogAuditParams {
  action: AuditAction;
  resourceType: AuditResource;
  resourceId: string;
  actorId?: string;
  organizationId?: string;
  before?: any;
  after?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * Record an event. Never throws so a logging failure cannot break the
   * operation it is tracking.
   */
  async log(params: LogAuditParams): Promise<void> {
    try {
      const entry = this.auditRepository.create(params);
      await this.auditRepository.save(entry);
    } catch (error) {
      console.error('[AuditService] Failed to log event:', error);
    }
  }

  /**
   * Filtered search for the admin audit viewer. Results ordered newest first.
   */
  async search(filters: {
    actorId?: string;
    resourceType?: AuditResource;
    resourceId?: string;
    action?: AuditAction;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const qb = this.auditRepository.createQueryBuilder('audit');

    if (filters.actorId) qb.andWhere('audit.actorId = :actorId', { actorId: filters.actorId });
    if (filters.resourceType)
      qb.andWhere('audit.resourceType = :resourceType', { resourceType: filters.resourceType });
    if (filters.resourceId)
      qb.andWhere('audit.resourceId = :resourceId', { resourceId: filters.resourceId });
    if (filters.action) qb.andWhere('audit.action = :action', { action: filters.action });
    if (filters.startDate)
      qb.andWhere('audit.createdAt >= :startDate', { startDate: filters.startDate });
    if (filters.endDate)
      qb.andWhere('audit.createdAt <= :endDate', { endDate: filters.endDate });

    qb.orderBy('audit.createdAt', 'DESC');
    qb.limit(filters.limit ?? 100);

    return qb.getMany();
  }

  /** How many events for a given resource (useful for "show activity" links). */
  async countForResource(resourceType: AuditResource, resourceId: string): Promise<number> {
    return this.auditRepository.count({ where: { resourceType, resourceId } });
  }
}
