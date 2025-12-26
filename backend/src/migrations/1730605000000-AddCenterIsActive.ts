import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCenterIsActive1730605000000 implements MigrationInterface {
  name = 'AddCenterIsActive1730605000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "centers" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "centers" DROP COLUMN IF EXISTS "isActive"`,
    );
  }
}
