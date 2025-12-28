import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMonthlyPaymentTransactions1730607200000
  implements MigrationInterface
{
  name = 'AddMonthlyPaymentTransactions1730607200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "monthly_payment_transactions" (
  "id" SERIAL PRIMARY KEY,
  "monthlyPaymentId" integer NOT NULL REFERENCES "monthly_payments"("id") ON DELETE CASCADE,
  "studentId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "centerId" integer NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
  "amount" numeric(10,2) NOT NULL DEFAULT 0,
  "note" text NULL,
  "paidAt" timestamptz NOT NULL DEFAULT now(),
  "createdByUserId" integer NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_monthly_payment_transactions_monthly" ON "monthly_payment_transactions" ("monthlyPaymentId","paidAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_monthly_payment_transactions_student" ON "monthly_payment_transactions" ("studentId","paidAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "monthly_payment_transactions"`);
  }
}
