import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WalletEntity } from './wallet.entity';

export enum TransactionType {
  DEPOSIT = 'deposit',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('transactions')
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ unique: true, nullable: true })
  reference: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ name: 'recipient_wallet_id', type: 'uuid', nullable: true })
  recipientWalletId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Relationships
  @ManyToOne(() => WalletEntity, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'wallet_id' })
  wallet: WalletEntity;

  @ManyToOne(() => WalletEntity, { nullable: true })
  @JoinColumn({ name: 'recipient_wallet_id' })
  recipientWallet: WalletEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
