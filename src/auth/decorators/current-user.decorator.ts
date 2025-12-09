import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';

/**
 * Custom decorator to extract current user from request
 * Usage: @CurrentUser() user: UserEntity
 *
 * Must be used with authentication guard (JwtAuthGuard, ApiKeyAuthGuard, etc.)
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserEntity => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
