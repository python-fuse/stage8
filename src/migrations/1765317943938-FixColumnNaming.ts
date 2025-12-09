import { MigrationInterface, QueryRunner } from "typeorm";

export class FixColumnNaming1765317943938 implements MigrationInterface {
    name = 'FixColumnNaming1765317943938'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Fix users table columns
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "googleId" TO "google_id"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at"`);

        // Fix wallets table columns
        await queryRunner.query(`ALTER TABLE "wallets" RENAME COLUMN "userId" TO "user_id"`);
        await queryRunner.query(`ALTER TABLE "wallets" RENAME COLUMN "walletNumber" TO "wallet_number"`);
        await queryRunner.query(`ALTER TABLE "wallets" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "wallets" RENAME COLUMN "updatedAt" TO "updated_at"`);

        // Fix transactions table columns
        await queryRunner.query(`ALTER TABLE "transactions" RENAME COLUMN "walletId" TO "wallet_id"`);
        await queryRunner.query(`ALTER TABLE "transactions" RENAME COLUMN "recipientWalletId" TO "recipient_wallet_id"`);
        await queryRunner.query(`ALTER TABLE "transactions" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "transactions" RENAME COLUMN "updatedAt" TO "updated_at"`);

        // Fix api_keys table columns
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "userId" TO "user_id"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "keyHash" TO "key_hash"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "expiresAt" TO "expires_at"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "lastUsedAt" TO "last_used_at"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "isActive" TO "is_active"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "createdAt" TO "created_at"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "updatedAt" TO "updated_at"`);

        // Fix constraint names
        await queryRunner.query(`ALTER TABLE "users" RENAME CONSTRAINT "UQ_users_googleId" TO "UQ_users_google_id"`);
        await queryRunner.query(`ALTER TABLE "wallets" RENAME CONSTRAINT "UQ_wallets_userId" TO "UQ_wallets_user_id"`);
        await queryRunner.query(`ALTER TABLE "wallets" RENAME CONSTRAINT "UQ_wallets_walletNumber" TO "UQ_wallets_wallet_number"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME CONSTRAINT "UQ_api_keys_keyHash" TO "UQ_api_keys_key_hash"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert constraint names
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME CONSTRAINT "UQ_api_keys_key_hash" TO "UQ_api_keys_keyHash"`);
        await queryRunner.query(`ALTER TABLE "wallets" RENAME CONSTRAINT "UQ_wallets_wallet_number" TO "UQ_wallets_walletNumber"`);
        await queryRunner.query(`ALTER TABLE "wallets" RENAME CONSTRAINT "UQ_wallets_user_id" TO "UQ_wallets_userId"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME CONSTRAINT "UQ_users_google_id" TO "UQ_users_googleId"`);

        // Revert api_keys table columns
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "is_active" TO "isActive"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "last_used_at" TO "lastUsedAt"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "expires_at" TO "expiresAt"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "key_hash" TO "keyHash"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "user_id" TO "userId"`);

        // Revert transactions table columns
        await queryRunner.query(`ALTER TABLE "transactions" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "transactions" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "transactions" RENAME COLUMN "recipient_wallet_id" TO "recipientWalletId"`);
        await queryRunner.query(`ALTER TABLE "transactions" RENAME COLUMN "wallet_id" TO "walletId"`);

        // Revert wallets table columns
        await queryRunner.query(`ALTER TABLE "wallets" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "wallets" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "wallets" RENAME COLUMN "wallet_number" TO "walletNumber"`);
        await queryRunner.query(`ALTER TABLE "wallets" RENAME COLUMN "user_id" TO "userId"`);

        // Revert users table columns
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "updated_at" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "created_at" TO "createdAt"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "google_id" TO "googleId"`);
    }

}
