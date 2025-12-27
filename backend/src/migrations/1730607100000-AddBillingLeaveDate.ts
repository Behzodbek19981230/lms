import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBillingLeaveDate1730607100000 implements MigrationInterface {
  name = 'AddBillingLeaveDate1730607100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_billing_profiles" ADD COLUMN IF NOT EXISTS "leaveDate" date NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_billing_profiles" DROP COLUMN IF EXISTS "leaveDate"`,
    );
  }
}
