import { Throttle as NestThrottle } from '@nestjs/throttler';

/**
 * Override default rate limits for a specific route.
 * @param limit - Max requests
 * @param ttl - Time window in seconds
 */
export const CustomThrottle = (limit: number, ttl: number) => NestThrottle({ default: { limit, ttl } });

/** Remove rate limiting from a route entirely. */
export const SkipThrottle = () => NestThrottle({ default: { limit: 0, ttl: 0 } });
