import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCurrencyToUsers1701506400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add currency columns to users table
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'currencyCode',
        type: 'varchar',
        length: '3',
        default: "'BDT'",
      }),
      new TableColumn({
        name: 'currencySymbol',
        type: 'varchar',
        length: '10',
        default: "'৳'",
      }),
      new TableColumn({
        name: 'currencyName',
        type: 'varchar',
        length: '100',
        default: "'Bangladeshi Taka'",
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove currency columns from users table
    await queryRunner.dropColumns('users', [
      'currencyCode',
      'currencySymbol',
      'currencyName',
    ]);
  }
}