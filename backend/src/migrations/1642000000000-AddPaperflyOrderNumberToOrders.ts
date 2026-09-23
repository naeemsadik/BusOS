import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddPaperflyOrderNumberToOrders1642000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasColumn("orders", "paperflyOrderNumber"))) {
            await queryRunner.addColumn("orders", new TableColumn({
                name: "paperflyOrderNumber",
                type: "varchar",
                isNullable: true,
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasColumn("orders", "paperflyOrderNumber")) {
            await queryRunner.dropColumn("orders", "paperflyOrderNumber");
        }
    }
}
