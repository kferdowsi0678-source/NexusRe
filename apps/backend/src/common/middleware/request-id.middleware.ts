import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Gives every request a correlation id and echoes it back to the caller.
 *
 * An id supplied by an upstream proxy or gateway is honoured so a trace stays
 * joined across hops, but only when it looks like an id — an unbounded header
 * would otherwise end up in log lines and error responses verbatim.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void): void {
    const supplied = req.headers?.[REQUEST_ID_HEADER];
    req.requestId = isUsableId(supplied) ? supplied : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, req.requestId);
    next();
  }
}

function isUsableId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
}
