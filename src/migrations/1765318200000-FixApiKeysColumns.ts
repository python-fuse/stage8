import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAllColumnMismatches1765318200000 implements MigrationInterface {
    name = 'FixAllColumnMismatches1765318200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Fix users.google_id - make it nullable
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "google_id" DROP NOT NULL`);
        
        // 2. Fix transactions.reference - make it nullable
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "reference" DROP NOT NULL`);
        
        // 3. Fix transactions status enum - add 'success' value and update data
        await queryRunner.query(`ALTER TYPE "public"."transactions_status_enum" ADD VALUE 'success'`);
        await queryRunner.query(`UPDATE "transactions" SET "status" = 'success' WHERE "status" = 'completed'`);
        // Note: Can't remove 'completed' from enum without recreating it, but having both is OK
        
        // 4. Fix api_keys - rename is_active to is_revoked and invert logic
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "is_active" TO "is_revoked"`);
        await queryRunner.query(`UPDATE "api_keys" SET "is_revoked" = NOT "is_revoked"`);
        
        // 5. Remove last_used_at column from api_keys (not in entity)
        await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN IF EXISTS "last_used_at"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes in reverse order
        
        // 5. Add back last_used_at
        await queryRunner.query(`ALTER TABLE "api_keys" ADD COLUMN "last_used_at" TIMESTAMP`);
        
        // 4. Revert api_keys is_revoked to is_active
        await queryRunner.query(`UPDATE "api_keys" SET "is_revoked" = NOT "is_revoked"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "is_revoked" TO "is_active"`);
        
        // 3. Revert status changes
        await queryRunner.query(`UPDATE "transactions" SET "status" = 'completed' WHERE "status" = 'success'`);
        
        // 2. Make transactions.reference NOT NULL again
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "reference" SET NOT NULL`);
        
        // 1. Make users.google_id NOT NULL again
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "google_id" SET NOT NULL`);
    }

}
