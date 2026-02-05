import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentMethod1738800000000 implements MigrationInterface {
  name = 'AddPaymentMethod1738800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add paymentMethod column to payments table
    await queryRunner.query(`
      CREATE TYPE "payment_method_enum" AS ENUM('cash', 'bank_transfer', 'click', 'payme', 'uzum', 'humo', 'other')
    `);

    await queryRunner.query(`
      ALTER TABLE "payments" 
      ADD COLUMN "paymentMethod" payment_method_enum
    `);

    // Add paymentMethod column to monthly_payment_transactions table
    await queryRunner.query(`
      ALTER TABLE "monthly_payment_transactions" 
      ADD COLUMN "paymentMethod" payment_method_enum
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove paymentMethod columns
    await queryRunner.query(`
      ALTER TABLE "monthly_payment_transactions" 
      DROP COLUMN "paymentMethod"
    `);

    await queryRunner.query(`
      ALTER TABLE "payments" 
      DROP COLUMN "paymentMethod"
    `);

    await queryRunner.query(`
      DROP TYPE "payment_method_enum"
    `);
  }
}
