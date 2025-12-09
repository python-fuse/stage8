import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * GET /auth/google
   * Initiates Google OAuth flow
   * Redirects user to Google's consent screen
   */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth sign-in' })
  @ApiResponse({ status: 302, description: 'Redirects to Google consent page' })
  async googleAuth() {
    // Guard redirects to Google, this method won't be called
  }

  /**
   * GET /auth/google/callback
   * Google redirects here after user consent
   * Creates/updates user, generates JWT, and returns token
   */
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'Returns JWT token and user info',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          name: 'John Doe',
          wallet: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            walletNumber: '1234567890123',
            balance: 0,
          },
        },
      },
    },
  })
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    // User is attached to request by GoogleStrategy
    const user = req.user as UserEntity;

    // Generate JWT token
    const loginResponse = await this.authService.login(user);

    // Option 1: Return JSON response (for API clients)
    return res.json(loginResponse);
  }

  /**
   * GET /auth/me
   * Get current authenticated user
   * Requires JWT token in Authorization header
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Returns current user details',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        name: 'John Doe',
        wallet: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          walletNumber: '1234567890123',
          balance: 5000,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Req() req: any) {
    return req.user;
  }
}
