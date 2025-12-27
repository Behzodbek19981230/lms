import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentsBillingTables1730607000000 implements MigrationInterface {
  name = 'PaymentsBillingTables1730607000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enum for monthly payment status
    await queryRunner.query(`
DO $$
BEGIN
  CREATE TYPE "monthly_payment_status_enum" AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`);

    // Student billing profiles (one per student)
    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "student_billing_profiles" (
  "studentId" integer PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "joinDate" date NOT NULL,
  "monthlyAmount" numeric(10,2) NOT NULL DEFAULT 0,
  "dueDay" integer NOT NULL DEFAULT 1,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
`);

    // Monthly payments (one per student per month)
    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "monthly_payments" (
  "id" SERIAL PRIMARY KEY,
  "studentId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "centerId" integer NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
  "billingMonth" date NOT NULL,
  "dueDate" date NOT NULL,
  "amountDue" numeric(10,2) NOT NULL DEFAULT 0,
  "amountPaid" numeric(10,2) NOT NULL DEFAULT 0,
  "status" "monthly_payment_status_enum" NOT NULL DEFAULT 'pending',
  "lastPaymentAt" timestamptz NULL,
  "paidAt" timestamptz NULL,
  "note" text NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_monthly_payments_student_month" UNIQUE ("studentId","billingMonth")
);
`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_monthly_payments_center_month" ON "monthly_payments" ("centerId","billingMonth")`,
    );

    // Backfill billing profiles for existing students
    await queryRunner.query(`
INSERT INTO "student_billing_profiles" ("studentId","joinDate","monthlyAmount","dueDay")
SELECT
  u."id",
  (u."createdAt")::date,
  0,
  EXTRACT(DAY FROM u."createdAt")::int
FROM "users" u
WHERE u."role" = 'student'
ON CONFLICT ("studentId") DO NOTHING;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "monthly_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_billing_profiles"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "monthly_payment_status_enum"`,
    );
  }
}
