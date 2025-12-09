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
      url: process.env.DATABASE_URL, // Neon connection string
      // Fallback to individual params if URL not provided
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'wallet_db',
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false, // Neon requires SSL
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: process.env.NODE_ENV !== 'production', // Auto-run in dev only
      synchronize: false, // Never use synchronize with migrations
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
