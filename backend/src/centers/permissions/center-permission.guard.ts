import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';
import { CENTER_PERMISSIONS_KEY } from './center-permission.decorator';
import { CenterPermissionKey, getEffectiveCenterPermissions } from './center-permissions';

@Injectable()
export class CenterPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<CenterPermissionKey[]>(
      CENTER_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req?.user as { role?: UserRole; center?: { permissions?: any } | null };

    if (!user?.role) return false;
    if (user.role === UserRole.SUPERADMIN) return true;

    if (!user.center) {
      throw new ForbiddenException("Sizga markaz biriktirilmagan");
    }

    const effective = getEffectiveCenterPermissions(user.center.permissions);
    const ok = required.every((k) => effective[k] === true);
    if (!ok) {
      throw new ForbiddenException('Permission denied');
    }
    return true;
  }
}
