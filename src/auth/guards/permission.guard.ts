import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ApiKeyPermission } from '../../keys/entities/key.entity';

/**
 * Permission guard to check if API key has required permissions
 * Only applies to requests authenticated with API keys, not JWT
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<
      ApiKeyPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If request is authenticated with JWT (not API key), allow all
    if (!user?.apiKey) {
      return true;
    }

    // Check if API key has all required permissions
    const apiKeyPermissions = user.apiKey.permissions as ApiKeyPermission[];

    const hasAllPermissions = requiredPermissions.every((permission) =>
      apiKeyPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `API key missing required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
