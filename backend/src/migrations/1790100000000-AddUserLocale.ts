import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLocale1790100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locale" character varying(2) NOT NULL DEFAULT 'en'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "locale"`);
  }
}
