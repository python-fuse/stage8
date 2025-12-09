import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { KeysService } from './keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';

@ApiTags('API Keys')
@ApiBearerAuth('JWT-auth')
@Controller('keys')
@UseGuards(JwtAuthGuard) // All endpoints require JWT authentication
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  /**
   * POST /keys/create
   * Create a new API key
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiBody({ type: CreateApiKeyDto })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully',
    schema: {
      example: {
        api_key: 'sk_live_a1b2c3d4e5f6g7h8i9j0...',
        expires_at: '2026-01-09T10:00:00.000Z',
        id: '123e4567-e89b-12d3-a456-426614174000',
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Maximum 5 active keys reached' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createApiKey(
    @CurrentUser() user: UserEntity,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    return await this.keysService.createApiKey(user.id, createApiKeyDto);
  }

  /**
   * POST /keys/rollover
   * Rollover an expired API key
   */
  @Post('rollover')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Rollover an expired API key' })
  @ApiBody({ type: RolloverApiKeyDto })
  @ApiResponse({
    status: 201,
    description: 'API key rolled over successfully',
    schema: {
      example: {
        api_key: 'sk_live_z9y8x7w6v5u4t3s2r1q0...',
        expires_at: '2026-12-09T10:00:00.000Z',
        id: '223e4567-e89b-12d3-a456-426614174001',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Key not expired or invalid' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async rolloverApiKey(
    @CurrentUser() user: UserEntity,
    @Body() rolloverDto: RolloverApiKeyDto,
  ) {
    return await this.keysService.rolloverApiKey(user.id, rolloverDto);
  }

  /**
   * GET /keys
   * List all API keys for the current user
   */
  @Get()
  @ApiOperation({ summary: 'List all API keys' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of API keys',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'wallet-service',
          permissions: ['deposit', 'transfer', 'read'],
          expires_at: '2026-01-09T10:00:00.000Z',
          is_revoked: false,
          is_expired: false,
          is_active: true,
          created_at: '2025-12-09T10:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listApiKeys(@CurrentUser() user: UserEntity) {
    const apiKeys = await this.keysService.listUserApiKeys(user.id);

    // Don't expose the key hash, return user-friendly info
    return apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      permissions: key.permissions,
      expires_at: key.expiresAt,
      is_revoked: key.isRevoked,
      is_expired: key.isExpired(),
      is_active: key.isActive(),
      created_at: key.createdAt,
    }));
  }

  /**
   * GET /keys/:id
   * Get details of a specific API key
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get API key details' })
  @ApiResponse({
    status: 200,
    description: 'Returns API key details',
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getApiKeyDetails(
    @CurrentUser() user: UserEntity,
    @Param('id') keyId: string,
  ) {
    const key = await this.keysService.getApiKeyDetails(user.id, keyId);

    return {
      id: key.id,
      name: key.name,
      permissions: key.permissions,
      expires_at: key.expiresAt,
      is_revoked: key.isRevoked,
      is_expired: key.isExpired(),
      is_active: key.isActive(),
      created_at: key.createdAt,
      updated_at: key.updatedAt,
    };
  }

  /**
   * DELETE /keys/:id
   * Revoke an API key
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({
    status: 200,
    description: 'API key revoked successfully',
    schema: {
      example: {
        message: 'API key revoked successfully',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeApiKey(
    @CurrentUser() user: UserEntity,
    @Param('id') keyId: string,
  ) {
    await this.keysService.revokeApiKey(user.id, keyId);

    return {
      message: 'API key revoked successfully',
    };
  }
}
