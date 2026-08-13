import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { REQUEST_ID_HEADER } from '../middleware/request-id.middleware';

/** The single error shape every endpoint returns. */
export interface ErrorResponseBody {
  statusCode: number;
  /** Machine-readable slug, e.g. `not_found`, `validation_failed`. */
  error: string;
  /** One or more human-readable messages. Always an array so clients need no branch. */
  message: string[];
  requestId: string;
  path: string;
  timestamp: string;
}

/**
 * Turns every thrown value into one error envelope.
 *
 * Without this, a client sees three different shapes: Nest's `{statusCode, message}`,
 * the ValidationPipe's `{message: string[]}`, and a bare 500 for anything else.
 * Unexpected errors are logged in full server-side and reduced to a generic
 * message for the caller, so a database error never leaks schema details.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw exception;

    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const requestId: string = request?.requestId ?? request?.headers?.[REQUEST_ID_HEADER] ?? '-';
    const path: string = request?.originalUrl ?? request?.url ?? '';

    const { status, error, messages, logAsError } = this.describe(exception);

    const body: ErrorResponseBody = {
      statusCode: status,
      error,
      message: messages,
      requestId,
      path,
      timestamp: new Date().toISOString(),
    };

    if (logAsError) {
      // Only unexpected failures get a stack; a 404 or a validation error is
      // normal traffic and would drown the log at that level.
      this.logger.error(
        `${request?.method} ${path} → ${status} [${requestId}] ${messages.join('; ')}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${request?.method} ${path} → ${status} [${requestId}]`);
    }

    response.status(status).json(body);
  }

  private describe(exception: unknown): {
    status: number;
    error: string;
    messages: string[];
    logAsError: boolean;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      return {
        status,
        error: slugFor(status, payload),
        messages: messagesFrom(payload, exception.message),
        // 5xx raised deliberately still deserves a stack; 4xx does not.
        logAsError: status >= HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }

    if (exception instanceof QueryFailedError) {
      // The driver message names tables, columns and constraint identifiers.
      // It goes to the log, never to the caller.
      return {
        status: HttpStatus.BAD_REQUEST,
        error: 'database_constraint_violation',
        messages: ['The request could not be completed against the current data.'],
        logAsError: true,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'internal_error',
      messages: ['Something went wrong. Quote the requestId when reporting this.'],
      logAsError: true,
    };
  }
}

const STATUS_SLUGS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'bad_request',
  [HttpStatus.UNAUTHORIZED]: 'unauthorized',
  [HttpStatus.FORBIDDEN]: 'forbidden',
  [HttpStatus.NOT_FOUND]: 'not_found',
  [HttpStatus.CONFLICT]: 'conflict',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'payload_too_large',
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'unsupported_media_type',
  [HttpStatus.TOO_MANY_REQUESTS]: 'rate_limited',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'internal_error',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'service_unavailable',
};

function slugFor(status: number, payload: unknown): string {
  // A ValidationPipe rejection is a 400 but is worth distinguishing, because a
  // client can map its per-field messages onto a form.
  if (status === HttpStatus.BAD_REQUEST && isValidationPayload(payload)) {
    return 'validation_failed';
  }
  return STATUS_SLUGS[status] ?? `http_${status}`;
}

function isValidationPayload(payload: unknown): boolean {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    Array.isArray((payload as { message?: unknown }).message)
  );
}

function messagesFrom(payload: unknown, fallback: string): string[] {
  if (typeof payload === 'string') return [payload];

  if (typeof payload === 'object' && payload !== null) {
    const message = (payload as { message?: unknown }).message;
    if (Array.isArray(message)) return message.map(String);
    if (typeof message === 'string') return [message];
  }

  return [fallback];
}
