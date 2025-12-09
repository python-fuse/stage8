import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentController } from './payment/payment.controller';
import { PaymentService } from './payment/payment.service';
import { PaymentModule } from './payment/payment.module';
import { AuthModule } from './auth/auth.module';
import { PaystackService } from './paystack/paystack.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsModule } from './wallets/wallets.module';
import { KeysModule } from './keys/keys.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'wallet_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: true, // Auto-run migrations on startup
      synchronize: false, // Disabled in favor of migrations
      logging: process.env.NODE_ENV === 'development',
    }),
    PaymentModule,
    AuthModule,
    WalletsModule,
    KeysModule,
  ],
  controllers: [AppController, PaymentController],
  providers: [AppService, PaymentService, PaystackService],
})
export class AppModule {}
