import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ApiKeyEntity, ApiKeyPermission } from './entities/key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RolloverApiKeyDto } from './dto/rollover-api-key.dto';

@Injectable()
export class KeysService {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepository: Repository<ApiKeyEntity>,
  ) {}

  /**
   * Parse expiry string (1H, 1D, 1M, 1Y) to Date
   */
  private parseExpiry(expiry: string): Date {
    const now = new Date();
    const value = parseInt(expiry.charAt(0));
    const unit = expiry.charAt(1);

    switch (unit) {
      case 'H':
        now.setHours(now.getHours() + value);
        break;
      case 'D':
        now.setDate(now.getDate() + value);
        break;
      case 'M':
        now.setMonth(now.getMonth() + value);
        break;
      case 'Y':
        now.setFullYear(now.getFullYear() + value);
        break;
      default:
        throw new BadRequestException('Invalid expiry format');
    }

    return now;
  }

  /**
   * Count active (non-revoked, non-expired) API keys for a user
   */
  private async countActiveKeys(userId: string): Promise<number> {
    return await this.apiKeyRepository.count({
      where: {
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  /**
   * Create a new API key for a user
   */
  async createApiKey(
    userId: string,
    createApiKeyDto: CreateApiKeyDto,
  ): Promise<{ api_key: string; expires_at: Date; id: string }> {
    // Check if user has reached the maximum of 5 active keys
    const activeKeyCount = await this.countActiveKeys(userId);

    if (activeKeyCount >= 5) {
      throw new ConflictException(
        'Maximum of 5 active API keys reached. Please revoke or wait for some keys to expire.',
      );
    }

    // Generate API key
    const plainKey = ApiKeyEntity.generateKey();
    const keyHash = ApiKeyEntity.hashKey(plainKey);

    // Parse expiry
    const expiresAt = this.parseExpiry(createApiKeyDto.expiry);

    // Create API key entity
    const apiKey = this.apiKeyRepository.create({
      userId,
      keyHash,
      name: createApiKeyDto.name,
      permissions: createApiKeyDto.permissions,
      expiresAt,
      isRevoked: false,
    });

    const savedKey = await this.apiKeyRepository.save(apiKey);

    // Return plain key (only time user will see it)
    return {
      api_key: plainKey,
      expires_at: savedKey.expiresAt,
      id: savedKey.id,
    };
  }

  /**
   * Rollover an expired API key with a new key using same permissions
   */
  async rolloverApiKey(
    userId: string,
    rolloverDto: RolloverApiKeyDto,
  ): Promise<{ api_key: string; expires_at: Date; id: string }> {
    // Find the expired key
    const expiredKey = await this.apiKeyRepository.findOne({
      where: {
        id: rolloverDto.expired_key_id,
        userId,
      },
    });

    if (!expiredKey) {
      throw new NotFoundException('API key not found');
    }

    // Verify the key is actually expired
    if (!expiredKey.isExpired()) {
      throw new BadRequestException(
        'API key is not expired. Cannot rollover a valid key.',
      );
    }

    // Check if user has reached the maximum of 5 active keys
    const activeKeyCount = await this.countActiveKeys(userId);

    if (activeKeyCount >= 5) {
      throw new ConflictException(
        'Maximum of 5 active API keys reached. Please revoke some keys first.',
      );
    }

    // Generate new API key with same permissions
    const plainKey = ApiKeyEntity.generateKey();
    const keyHash = ApiKeyEntity.hashKey(plainKey);

    // Parse new expiry
    const expiresAt = this.parseExpiry(rolloverDto.expiry);

    // Create new API key with same permissions as expired key
    const newApiKey = this.apiKeyRepository.create({
      userId,
      keyHash,
      name: `${expiredKey.name} (Rolled Over)`,
      permissions: expiredKey.permissions,
      expiresAt,
      isRevoked: false,
    });

    const savedKey = await this.apiKeyRepository.save(newApiKey);

    return {
      api_key: plainKey,
      expires_at: savedKey.expiresAt,
      id: savedKey.id,
    };
  }

  /**
   * Validate an API key (used by API Key strategy)
   */
  async validateApiKey(keyString: string): Promise<ApiKeyEntity | null> {
    const keyHash = ApiKeyEntity.hashKey(keyString);

    const apiKey = await this.apiKeyRepository.findOne({
      where: { keyHash },
      relations: ['user'],
    });

    if (!apiKey) {
      return null;
    }

    // Check if key is active (not revoked and not expired)
    if (!apiKey.isActive()) {
      return null;
    }

    return apiKey;
  }

  /**
   * List all API keys for a user
   */
  async listUserApiKeys(userId: string): Promise<ApiKeyEntity[]> {
    return await this.apiKeyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.isRevoked) {
      throw new BadRequestException('API key is already revoked');
    }

    apiKey.isRevoked = true;
    await this.apiKeyRepository.save(apiKey);
  }

  /**
   * Get API key details (without exposing the actual key)
   */
  async getApiKeyDetails(userId: string, keyId: string): Promise<ApiKeyEntity> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }
}
