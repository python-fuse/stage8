import { SetMetadata } from '@nestjs/common';
import { ApiKeyPermission } from '../../keys/entities/key.entity';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for an endpoint
 * Usage: @RequirePermissions('deposit', 'transfer')
 */
export const RequirePermissions = (...permissions: ApiKeyPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
