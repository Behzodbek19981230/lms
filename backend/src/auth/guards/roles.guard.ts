import { Injectable, type CanActivate, type ExecutionContext, Logger } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { UserRole } from "../../users/entities/user.entity"

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>("roles", [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles) {
      this.logger.log('No roles required, allowing access');
      return true
    }

    const { user } = context.switchToHttp().getRequest()
    
    this.logger.log(`Role check: Required roles: ${JSON.stringify(requiredRoles)}, User role: ${user?.role}, User: ${JSON.stringify({ id: user?.id, username: user?.username, role: user?.role })}`);
    
    const hasRole = requiredRoles.some((role) => user.role === role);
    
    this.logger.log(`Role check result: ${hasRole}`);
    
    return hasRole;
  }
}
