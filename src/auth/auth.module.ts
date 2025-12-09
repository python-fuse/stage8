import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from './entities/user.entity';
import { WalletEntity } from '../wallets/entities/wallet.entity';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { KeysModule } from '../keys/keys.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, WalletEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'fallback-secret',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRY') || '7d') as any,
        },
      }),
    }),
    forwardRef(() => KeysModule), // Use forwardRef to resolve circular dependency
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, JwtStrategy, ApiKeyStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
