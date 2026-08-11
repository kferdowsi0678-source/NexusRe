import { SetMetadata } from '@nestjs/common';
import { RoleType } from '../../modules/users/entities/role.entity';

export const ROLES_KEY = 'roles';

/** Restrict a route to the listed roles. Requires RolesGuard after JwtAuthGuard. */
export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles);
