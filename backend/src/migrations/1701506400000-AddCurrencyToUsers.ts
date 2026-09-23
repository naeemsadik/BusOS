import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCurrencyToUsers1701506400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = [
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
    ];
    for (const column of columns) {
      if (!(await queryRunner.hasColumn('users', column.name))) {
        await queryRunner.addColumn('users', column);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of ['currencyCode', 'currencySymbol', 'currencyName']) {
      if (await queryRunner.hasColumn('users', column)) {
        await queryRunner.dropColumn('users', column);
      }
    }
  }
}
