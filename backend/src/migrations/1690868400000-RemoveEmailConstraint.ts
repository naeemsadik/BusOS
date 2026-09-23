import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveEmailConstraint1690868400000 implements MigrationInterface {
    name = 'RemoveEmailConstraint1690868400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove uniqueness without dropping the column or its customer data.
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_email"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_customers_email"`);
        await queryRunner.query(`
          DO $$
          DECLARE constraint_name text;
          BEGIN
            FOR constraint_name IN
              SELECT constraint_record.conname
              FROM pg_constraint constraint_record
              JOIN pg_class table_record ON table_record.oid = constraint_record.conrelid
              JOIN pg_namespace schema_record ON schema_record.oid = table_record.relnamespace
              JOIN pg_attribute column_record ON column_record.attrelid = table_record.oid
                AND column_record.attnum = ANY(constraint_record.conkey)
              WHERE schema_record.nspname = current_schema()
                AND table_record.relname = 'customers'
                AND column_record.attname = 'email'
                AND constraint_record.contype = 'u'
            LOOP
              EXECUTE format('ALTER TABLE "customers" DROP CONSTRAINT %I', constraint_name);
            END LOOP;
          END $$
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_customers_email" ON "customers" ("email") WHERE "email" IS NOT NULL`);
    }
}
