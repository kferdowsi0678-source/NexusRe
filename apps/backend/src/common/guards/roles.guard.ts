import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleType } from '../../modules/users/entities/role.entity';
import { AuthenticatedRequest } from '../interfaces/authenticated-request';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleType[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles on the route means no role restriction beyond authentication.
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const granted = request.user?.roles ?? [];

    // super_admin is deliberately a universal override.
    if (granted.includes(RoleType.SUPER_ADMIN)) return true;

    if (!required.some((role) => granted.includes(role))) {
      throw new ForbiddenException('Your role does not permit this action');
    }
    return true;
  }
}
