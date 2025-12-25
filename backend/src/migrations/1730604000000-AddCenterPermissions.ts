import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCenterPermissions1730604000000 implements MigrationInterface {
  name = 'AddCenterPermissions1730604000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "centers" ADD COLUMN IF NOT EXISTS "permissions" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "centers" DROP COLUMN IF EXISTS "permissions"`,
    );
  }
}
