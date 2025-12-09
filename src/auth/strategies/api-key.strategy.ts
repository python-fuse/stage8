import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { KeysService } from '../../keys/keys.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly keysService: KeysService) {
    super();
  }

  async validate(req: Request): Promise<any> {
    // Extract API key from x-api-key header
    const apiKeyString = req.headers['x-api-key'] as string;

    if (!apiKeyString) {
      throw new UnauthorizedException('API key is required');
    }

    // Validate the API key
    const apiKey = await this.keysService.validateApiKey(apiKeyString);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid, expired, or revoked API key');
    }

    // Attach both user and apiKey to request
    return {
      ...apiKey.user,
      apiKey: {
        id: apiKey.id,
        permissions: apiKey.permissions,
        name: apiKey.name,
      },
    };
  }
}
