import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentGroupBillingProfiles1767420000000
  implements MigrationInterface
{
  name = 'AddStudentGroupBillingProfiles1767420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "student_group_billing_profiles" (
  "id" SERIAL PRIMARY KEY,
  "studentId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "groupId" integer NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
  "joinDate" date NOT NULL,
  "leaveDate" date NULL,
  "monthlyAmount" numeric(10,2) NOT NULL DEFAULT 0,
  "dueDay" integer NOT NULL DEFAULT 1,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_student_group_billing_profile" UNIQUE ("studentId", "groupId")
);
`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_student_group_billing_profiles_student" ON "student_group_billing_profiles" ("studentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_student_group_billing_profiles_group" ON "student_group_billing_profiles" ("groupId")`,
    );

    // Update monthly payments unique constraint to allow multiple groups per student per month.
    await queryRunner.query(
      `ALTER TABLE "monthly_payments" DROP CONSTRAINT IF EXISTS "uq_monthly_payments_student_month"`,
    );
    await queryRunner.query(
      `ALTER TABLE "monthly_payments" ADD CONSTRAINT "uq_monthly_payments_student_group_month" UNIQUE ("studentId", "groupId", "billingMonth")`,
    );

    // Backfill group billing profiles for existing group_students relations.
    // We don't have per-group joinDate, so default to student's createdAt.
    await queryRunner.query(`
INSERT INTO "student_group_billing_profiles" ("studentId", "groupId", "joinDate", "leaveDate", "monthlyAmount", "dueDay")
SELECT
  gs."studentId",
  gs."groupId",
  (u."createdAt")::date,
  NULL,
  0,
  EXTRACT(DAY FROM u."createdAt")::int
FROM "group_students" gs
JOIN "users" u ON u."id" = gs."studentId"
WHERE u."role" = 'student'
ON CONFLICT ("studentId", "groupId") DO NOTHING;
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "monthly_payments" DROP CONSTRAINT IF EXISTS "uq_monthly_payments_student_group_month"`,
    );
    await queryRunner.query(
      `ALTER TABLE "monthly_payments" ADD CONSTRAINT "uq_monthly_payments_student_month" UNIQUE ("studentId", "billingMonth")`,
    );

    await queryRunner.query(
      `DROP TABLE IF EXISTS "student_group_billing_profiles"`,
    );
  }
}
