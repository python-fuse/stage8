import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { WalletEntity } from './entities/wallet.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { PaystackService } from '../paystack/paystack.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletEntity, TransactionEntity, UserEntity]),
    AuthModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService, PaystackService],
  exports: [WalletsService],
})
export class WalletsModule {}
