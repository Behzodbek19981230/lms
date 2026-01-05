import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskNotDone20260105120000 implements MigrationInterface {
  name = 'CreateTaskNotDone20260105120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
CREATE TABLE IF NOT EXISTS "task_not_done" (
  "id" SERIAL PRIMARY KEY,
  "groupId" integer NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
  "studentId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "markedById" integer NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "uq_task_not_done_group_student_date" UNIQUE ("groupId","studentId","date")
);
`);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_task_not_done_group_date" ON "task_not_done" ("groupId","date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "task_not_done"`);
  }
}
