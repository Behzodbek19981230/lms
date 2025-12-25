import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: UserRole } }>();
    const { user } = request;

    if (!user) {
      this.logger.error('User not found in request for role check');
      return false;
    }

    const userRole = String((user as any).role || '').toLowerCase();
    const hasRole = requiredRoles.some(
      (role) => String(role).toLowerCase() === userRole,
    );

    if (!hasRole) {
      this.logger.warn(
        `Role denied. required=[${requiredRoles.join(',')}], got=${(user as any).role}`,
      );
    }

    return hasRole;
  }
}
