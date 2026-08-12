import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';
import {
  AuditAction,
  AuditResource,
} from '../../modules/audit/entities/audit-log.entity';
import { AuthenticatedUser } from '../interfaces/authenticated-request';

/** Field names whose values must never reach the audit table. */
const REDACTED_FIELDS = [
  'password',
  'newPassword',
  'currentPassword',
  'confirmPassword',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'resetToken',
  'secret',
  'apiKey',
];

const METHOD_TO_ACTION: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PATCH: AuditAction.UPDATE,
  PUT: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
};

/** URL segment → audit resource. The first segment after /api that matches wins. */
const PATH_TO_RESOURCE: Record<string, AuditResource> = {
  users: AuditResource.USER,
  organizations: AuditResource.ORGANIZATION,
  submissions: AuditResource.SUBMISSION,
  quotes: AuditResource.QUOTE,
  documents: AuditResource.DOCUMENT,
  forms: AuditResource.FORM_SCHEMA,
  'form-schemas': AuditResource.FORM_SCHEMA,
  appetite: AuditResource.RISK_APPETITE,
  messaging: AuditResource.MESSAGE,
  messages: AuditResource.MESSAGE,
  notifications: AuditResource.NOTIFICATION,
};

/**
 * Records every state-changing request in the audit trail.
 *
 * Writes are deferred with setImmediate so logging never delays a response, and
 * AuditService.log swallows its own failures so a logging problem cannot break
 * the operation being tracked. Routes opt out with `@SkipAudit()`.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>('skipAudit', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest();
    const action = METHOD_TO_ACTION[request.method];

    // Reads are not audited here; document views are logged explicitly by the
    // storage module where the viewed document is actually known.
    if (!action) return next.handle();

    const user: AuthenticatedUser | undefined = request.user;
    const path: string = request.route?.path ?? request.url ?? '';
    const resourceType = this.resolveResource(path);
    const ipAddress = this.resolveIp(request);
    const userAgent = request.headers?.['user-agent'];

    return next.handle().pipe(
      tap((response) => {
        setImmediate(() => {
          void this.auditService.log({
            action,
            resourceType,
            resourceId: this.resolveResourceId(response, request),
            actorId: user?.userId,
            organizationId: user?.organizationId,
            after: this.redact(response),
            ipAddress,
            userAgent,
            metadata: { method: request.method, path },
          });
        });
      }),
    );
  }

  /**
   * Infers the resource from the URL. Routes that do not follow the REST shape
   * fall back to the submission resource only when they are nested under it;
   * anything else is recorded against the closest known segment.
   */
  private resolveResource(path: string): AuditResource {
    const segments = path.split('/').filter((s) => s && !s.startsWith(':'));

    // Prefer the most specific (last) recognised segment, e.g.
    // /api/submissions/:id/documents → document, not submission.
    for (let i = segments.length - 1; i >= 0; i -= 1) {
      const match = PATH_TO_RESOURCE[segments[i]];
      if (match) return match;
    }
    return AuditResource.SUBMISSION;
  }

  private resolveResourceId(response: unknown, request: any): string {
    if (response && typeof response === 'object') {
      const id = (response as Record<string, unknown>).id;
      if (typeof id === 'string') return id;
    }
    return request.params?.id ?? 'unknown';
  }

  private resolveIp(request: any): string | undefined {
    const forwarded = request.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? request.socket?.remoteAddress;
  }

  /**
   * Deep-copies a payload with sensitive fields replaced. Returns undefined for
   * anything that is not a plain object or array so the column stays null.
   */
  private redact(value: unknown, depth = 0): unknown {
    if (depth > 6 || value === null || value === undefined) return undefined;

    if (Array.isArray(value)) {
      // Collections are summarised: an audit row should not copy a whole page.
      return { count: value.length };
    }

    if (typeof value !== 'object') return undefined;
    if (value instanceof Date) return value.toISOString();

    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (REDACTED_FIELDS.includes(key)) {
        result[key] = '[REDACTED]';
      } else if (item instanceof Date) {
        result[key] = item.toISOString();
      } else if (item !== null && typeof item === 'object') {
        result[key] = this.redact(item, depth + 1);
      } else {
        result[key] = item;
      }
    }
    return result;
  }
}
