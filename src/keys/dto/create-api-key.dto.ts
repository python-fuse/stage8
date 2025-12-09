import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApiKeyPermission } from '../entities/key.entity';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'A descriptive name for the API key',
    example: 'Mobile App Key',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Array of permissions for this key',
    example: ['read', 'deposit', 'transfer'],
    enum: ApiKeyPermission,
    isArray: true,
  })
  @IsArray()
  @IsEnum(ApiKeyPermission, { each: true })
  permissions: ApiKeyPermission[];

  @ApiProperty({
    description:
      'Key expiry duration: 1H (hour), 1D (day), 1M (month), 1Y (year)',
    example: '1M',
    pattern: '^(1H|1D|1M|1Y)$',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(1H|1D|1M|1Y)$/, {
    message: 'Expiry must be one of: 1H, 1D, 1M, 1Y',
  })
  expiry: string;
}
