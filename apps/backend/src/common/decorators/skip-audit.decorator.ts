import { SetMetadata } from '@nestjs/common';

/** Mark a route to bypass the global audit interceptor. */
export const SkipAudit = () => SetMetadata('skipAudit', true);
