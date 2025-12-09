import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import * as crypto from 'crypto';

export enum ApiKeyPermission {
  DEPOSIT = 'deposit',
  TRANSFER = 'transfer',
  READ = 'read',
}

@Entity('api_keys')
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'key_hash', unique: true })
  keyHash: string;

  @Column()
  name: string;

  @Column({
    type: 'simple-array', // Stores as comma-separated string
  })
  permissions: ApiKeyPermission[];

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  // Relationships
  @ManyToOne(() => UserEntity, (user) => user.apiKeys)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper method to hash API key
  static hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  // Helper method to generate API key
  static generateKey(): string {
    const randomString = crypto.randomBytes(32).toString('hex');
    return `sk_live_${randomString}`;
  }

  // Check if key is expired
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Check if key is active (not revoked and not expired)
  isActive(): boolean {
    return !this.isRevoked && !this.isExpired();
  }

  // Check if key has specific permission
  hasPermission(permission: ApiKeyPermission): boolean {
    return this.permissions.includes(permission);
  }

  // Check if key has all required permissions
  hasPermissions(permissions: ApiKeyPermission[]): boolean {
    return permissions.every((permission) => this.hasPermission(permission));
  }
}
