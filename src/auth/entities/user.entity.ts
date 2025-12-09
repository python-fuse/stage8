import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WalletEntity } from '../../wallets/entities/wallet.entity';
import { ApiKeyEntity } from '../../keys/entities/key.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'google_id', unique: true, nullable: true })
  googleId: string;

  @Column()
  name: string;

  // Relationships
  @OneToOne(() => WalletEntity, (wallet) => wallet.user, { cascade: true })
  wallet: WalletEntity;

  @OneToMany(() => ApiKeyEntity, (apiKey) => apiKey.user)
  apiKeys: ApiKeyEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
