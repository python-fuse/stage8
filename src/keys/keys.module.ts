import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeysService } from './keys.service';
import { KeysController } from './keys.controller';
import { ApiKeyEntity } from './entities/key.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKeyEntity]),
    forwardRef(() => AuthModule), // Use forwardRef to resolve circular dependency
  ],
  providers: [KeysService],
  controllers: [KeysController],
  exports: [KeysService],
})
export class KeysModule {}
