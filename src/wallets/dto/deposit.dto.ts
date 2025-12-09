import { IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({
    description: 'Amount to deposit in kobo/cents (minimum 100)',
    example: 5000,
    minimum: 100,
  })
  @IsNumber()
  @IsPositive()
  @Min(100) // Minimum deposit amount (in kobo/cents)
  amount: number;
}
