import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuthenticatedUser } from '../interfaces/authenticated-request';

/** Requests slower than this are logged at warn so they stand out. */
const SLOW_REQUEST_MS = 1000;

/**
 * One structured line per request: who, what, the outcome, and how long it took.
 *
 * In production the line is JSON so a log shipper can index it; in development
 * it stays human-readable. Both carry the correlation id set by
 * RequestIdMiddleware, which is also returned to the caller in the error
 * envelope — that is what makes a user-reported failure findable.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Request');
  private readonly asJson = process.env.NODE_ENV === 'production';

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        // Failures are logged by AllExceptionsFilter, which knows the status it
        // chose; logging them here too would double every error line.
        next: () => this.write(request, response?.statusCode ?? 200, startedAt),
      }),
    );
  }

  private write(request: any, statusCode: number, startedAt: number): void {
    const durationMs = Date.now() - startedAt;
    const user: AuthenticatedUser | undefined = request.user;

    const entry = {
      requestId: request.requestId ?? '-',
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode,
      durationMs,
      userId: user?.userId,
      organizationId: user?.organizationId,
      ip: resolveIp(request),
    };

    const line = this.asJson
      ? JSON.stringify(entry)
      : `${entry.method} ${entry.path} ${entry.statusCode} ${entry.durationMs}ms [${entry.requestId}]`;

    if (durationMs >= SLOW_REQUEST_MS) {
      this.logger.warn(line);
    } else {
      this.logger.log(line);
    }
  }
}

function resolveIp(request: any): string | undefined {
  const forwarded = request.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return request.ip ?? request.socket?.remoteAddress;
}
