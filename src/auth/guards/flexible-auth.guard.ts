import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Flexible authentication guard that accepts either JWT or API Key
 * Tries JWT first, then falls back to API Key
 */
@Injectable()
export class FlexibleAuthGuard extends AuthGuard(['jwt', 'api-key']) {
  handleRequest(err: any, user: any, info: any, context: any) {
    // If no error and user is found, return user
    if (!err && user) {
      return user;
    }

    // If there's an error or no user, throw unauthorized
    throw err || new UnauthorizedException('Authentication required');
  }
}
