/**
 * Shape of req.user after JwtStrategy.validate().
 * Kept free of express types so no @types/express dependency is required.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  organizationId: string;
  roles: string[];
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}
