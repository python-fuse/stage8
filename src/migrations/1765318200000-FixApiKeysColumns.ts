import { MigrationInterface, QueryRunner } from "typeorm";

export class FixApiKeysColumns1765318200000 implements MigrationInterface {
    name = 'FixApiKeysColumns1765318200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename is_active to is_revoked and invert the logic
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "is_active" TO "is_revoked"`);
        await queryRunner.query(`UPDATE "api_keys" SET "is_revoked" = NOT "is_revoked"`);
        
        // Drop the last_used_at column since it's not in the entity
        await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "last_used_at"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add back last_used_at column
        await queryRunner.query(`ALTER TABLE "api_keys" ADD COLUMN "last_used_at" TIMESTAMP`);
        
        // Rename back and invert logic
        await queryRunner.query(`UPDATE "api_keys" SET "is_revoked" = NOT "is_revoked"`);
        await queryRunner.query(`ALTER TABLE "api_keys" RENAME COLUMN "is_revoked" TO "is_active"`);
    }

}
