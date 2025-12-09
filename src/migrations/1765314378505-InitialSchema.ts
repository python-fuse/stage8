import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1765314378505 implements MigrationInterface {
  name = 'InitialSchema1765314378505';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create enum types
    await queryRunner.query(`
            CREATE TYPE "public"."transactions_type_enum" AS ENUM('deposit', 'transfer_in', 'transfer_out')
        `);

    await queryRunner.query(`
            CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'completed', 'failed')
        `);

    // Create users table
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "googleId" character varying NOT NULL,
                "name" character varying NOT NULL,
                "picture" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "UQ_users_googleId" UNIQUE ("googleId"),
                CONSTRAINT "PK_users" PRIMARY KEY ("id")
            )
        `);

    // Create wallets table
    await queryRunner.query(`
            CREATE TABLE "wallets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "walletNumber" character varying NOT NULL,
                "balance" numeric(15,2) NOT NULL DEFAULT '0',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_wallets_walletNumber" UNIQUE ("walletNumber"),
                CONSTRAINT "UQ_wallets_userId" UNIQUE ("userId"),
                CONSTRAINT "PK_wallets" PRIMARY KEY ("id")
            )
        `);

    // Create transactions table
    await queryRunner.query(`
            CREATE TABLE "transactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "walletId" uuid NOT NULL,
                "type" "public"."transactions_type_enum" NOT NULL,
                "amount" numeric(15,2) NOT NULL,
                "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'pending',
                "reference" character varying NOT NULL,
                "recipientWalletId" uuid,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_transactions_reference" UNIQUE ("reference"),
                CONSTRAINT "PK_transactions" PRIMARY KEY ("id")
            )
        `);

    // Create api_keys table
    await queryRunner.query(`
            CREATE TABLE "api_keys" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "name" character varying NOT NULL,
                "keyHash" character varying NOT NULL,
                "permissions" text NOT NULL,
                "expiresAt" TIMESTAMP,
                "lastUsedAt" TIMESTAMP,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_api_keys_keyHash" UNIQUE ("keyHash"),
                CONSTRAINT "PK_api_keys" PRIMARY KEY ("id")
            )
        `);

    // Add foreign keys
    await queryRunner.query(`
            ALTER TABLE "wallets"
            ADD CONSTRAINT "FK_wallets_userId"
            FOREIGN KEY ("userId") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "transactions"
            ADD CONSTRAINT "FK_transactions_walletId"
            FOREIGN KEY ("walletId") REFERENCES "wallets"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "transactions"
            ADD CONSTRAINT "FK_transactions_recipientWalletId"
            FOREIGN KEY ("recipientWalletId") REFERENCES "wallets"("id")
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "api_keys"
            ADD CONSTRAINT "FK_api_keys_userId"
            FOREIGN KEY ("userId") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // Create indexes for performance
    await queryRunner.query(`
            CREATE INDEX "IDX_wallets_userId" ON "wallets" ("userId")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_transactions_walletId" ON "transactions" ("walletId")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_transactions_reference" ON "transactions" ("reference")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_transactions_status" ON "transactions" ("status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_api_keys_userId" ON "api_keys" ("userId")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_api_keys_keyHash" ON "api_keys" ("keyHash")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_api_keys_keyHash"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_api_keys_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_transactions_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_transactions_reference"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_transactions_walletId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_wallets_userId"`);

    // Drop foreign keys
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "FK_api_keys_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_recipientWalletId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_walletId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallets" DROP CONSTRAINT "FK_wallets_userId"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TABLE "wallets"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
  }
}
