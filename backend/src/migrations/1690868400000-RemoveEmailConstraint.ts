import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveEmailConstraint1690868400000 implements MigrationInterface {
    name = 'RemoveEmailConstraint1690868400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop any existing indexes/constraints on the email column
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_email"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_customers_email"`);
        
        // Drop the email column and recreate it without any constraints
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "customers" ADD "email" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert changes
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "customers" ADD "email" character varying UNIQUE`);
    }
}
