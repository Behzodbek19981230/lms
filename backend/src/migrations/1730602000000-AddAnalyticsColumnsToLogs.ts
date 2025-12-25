import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnalyticsColumnsToLogs1730602000000
  implements MigrationInterface
{
  name = 'AddAnalyticsColumnsToLogs1730602000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "logs" ADD COLUMN IF NOT EXISTS "eventType" varchar(32)',
    );
    await queryRunner.query(
      'ALTER TABLE "logs" ADD COLUMN IF NOT EXISTS "path" varchar(1024)',
    );
    await queryRunner.query(
      'ALTER TABLE "logs" ADD COLUMN IF NOT EXISTS "method" varchar(16)',
    );
    await queryRunner.query(
      'ALTER TABLE "logs" ADD COLUMN IF NOT EXISTS "referrer" varchar(1024)',
    );
    await queryRunner.query(
      'ALTER TABLE "logs" ADD COLUMN IF NOT EXISTS "deviceType" varchar(32)',
    );
    await queryRunner.query(
      'ALTER TABLE "logs" ADD COLUMN IF NOT EXISTS "browser" varchar(64)',
    );
    await queryRunner.query(
      'ALTER TABLE "logs" ADD COLUMN IF NOT EXISTS "os" varchar(64)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "logs" DROP COLUMN IF EXISTS "os"');
    await queryRunner.query(
      'ALTER TABLE "logs" DROP COLUMN IF EXISTS "browser"',
    );
    await queryRunner.query(
      'ALTER TABLE "logs" DROP COLUMN IF EXISTS "deviceType"',
    );
    await queryRunner.query(
      'ALTER TABLE "logs" DROP COLUMN IF EXISTS "referrer"',
    );
    await queryRunner.query(
      'ALTER TABLE "logs" DROP COLUMN IF EXISTS "method"',
    );
    await queryRunner.query('ALTER TABLE "logs" DROP COLUMN IF EXISTS "path"');
    await queryRunner.query(
      'ALTER TABLE "logs" DROP COLUMN IF EXISTS "eventType"',
    );
  }
}
