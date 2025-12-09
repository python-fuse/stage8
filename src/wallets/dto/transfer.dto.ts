import { IsString, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({
    description: 'Recipient wallet number (13 digits)',
    example: '1234567890123',
  })
  @IsString()
  wallet_number: string;

  @ApiProperty({
    description: 'Amount to transfer in kobo/cents',
    example: 1000,
    minimum: 1,
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}
