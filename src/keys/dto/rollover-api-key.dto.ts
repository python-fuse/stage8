import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RolloverApiKeyDto {
  @ApiProperty({
    description: 'ID of the expired API key to rollover',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  expired_key_id: string;

  @ApiProperty({
    description:
      'New expiry duration: 1H (hour), 1D (day), 1M (month), 1Y (year)',
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
