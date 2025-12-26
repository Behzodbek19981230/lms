import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelegramLinkTokens1730606000000 implements MigrationInterface {
  name = 'AddTelegramLinkTokens1730606000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "telegram_link_tokens" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "token" character varying NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "usedAt" TIMESTAMP,
        "usedTelegramUserId" character varying,
        "userId" integer NOT NULL,
        CONSTRAINT "PK_telegram_link_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_telegram_link_tokens_token" UNIQUE ("token"),
        CONSTRAINT "FK_telegram_link_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_telegram_link_tokens_token" ON "telegram_link_tokens" ("token");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "telegram_link_tokens";`,
    );
  }
}
