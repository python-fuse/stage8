import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { TransactionEntity } from './transaction.entity';

@Entity('wallets')
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'wallet_number', unique: true, length: 13 })
  walletNumber: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  // Relationships
  @OneToOne(() => UserEntity, (user) => user.wallet)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToMany(() => TransactionEntity, (transaction) => transaction.wallet)
  transactions: TransactionEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Auto-generate wallet number before insert
  @BeforeInsert()
  generateWalletNumber() {
    if (!this.walletNumber) {
      // Generate 13-digit wallet number
      this.walletNumber = '';
      for (let i = 0; i < 13; i++) {
        this.walletNumber += Math.floor(Math.random() * 10).toString();
      }
    }
  }
}
