import { MigrationInterface, QueryRunner } from 'typeorm';

export class DefaultDueDay101767430000000 implements MigrationInterface {
  name = 'DefaultDueDay101767430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure DB defaults are 10
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "student_group_billing_profiles" ALTER COLUMN "dueDay" SET DEFAULT 10`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "student_billing_profiles" ALTER COLUMN "dueDay" SET DEFAULT 10`,
    );

    // Backfill existing profiles to 10
    await queryRunner.query(
      `UPDATE "student_group_billing_profiles" SET "dueDay" = 10 WHERE "dueDay" IS DISTINCT FROM 10`,
    );

    // student_billing_profiles might not exist in some DBs; guard with DO block
    await queryRunner.query(`
DO $$
BEGIN
  IF to_regclass('public.student_billing_profiles') IS NOT NULL THEN
    EXECUTE 'UPDATE "student_billing_profiles" SET "dueDay" = 10 WHERE "dueDay" IS DISTINCT FROM 10';
  END IF;
END $$;
`);

    // Update dueDate for all unpaid/un-cancelled monthly payments to the 10th of their month.
    // billingMonth is stored as the first day of month, so +9 days => 10th.
    await queryRunner.query(`
UPDATE "monthly_payments"
SET "dueDate" = ("billingMonth" + INTERVAL '9 days')::date
WHERE ("amountDue" - "amountPaid") > 0
  AND "status" <> 'cancelled';
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "student_group_billing_profiles" ALTER COLUMN "dueDay" SET DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "student_billing_profiles" ALTER COLUMN "dueDay" SET DEFAULT 1`,
    );
  }
}
