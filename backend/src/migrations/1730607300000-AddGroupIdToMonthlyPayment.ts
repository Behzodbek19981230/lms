import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddGroupIdToMonthlyPayment1730607300000 implements MigrationInterface {
  name = 'AddGroupIdToMonthlyPayment1730607300000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add groupId column
    await queryRunner.addColumn(
      'monthly_payments',
      new TableColumn({
        name: 'groupId',
        type: 'int',
        isNullable: true,
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'monthly_payments',
      new TableForeignKey({
        columnNames: ['groupId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'groups',
        onDelete: 'SET NULL',
      }),
    );

    // Create index for better query performance
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_monthly_payments_groupId" ON "monthly_payments" ("groupId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('monthly_payments');
    const foreignKey = table?.foreignKeys.find((fk) => fk.columnNames.indexOf('groupId') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('monthly_payments', foreignKey);
    }

    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_monthly_payments_groupId"`);

    // Drop column
    await queryRunner.dropColumn('monthly_payments', 'groupId');
  }
}
