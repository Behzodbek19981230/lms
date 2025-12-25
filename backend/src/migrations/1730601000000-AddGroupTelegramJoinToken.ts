import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroupTelegramJoinToken1730601000000
  implements MigrationInterface
{
  name = 'AddGroupTelegramJoinToken1730601000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "telegramJoinToken" varchar(64)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "groups" DROP COLUMN IF EXISTS "telegramJoinToken"',
    );
  }
}
