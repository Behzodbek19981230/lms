import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCenterIdToTelegramMessageLog1766991707579 implements MigrationInterface {
    name = 'AddCenterIdToTelegramMessageLog1766991707579'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "centers" ALTER COLUMN "permissions" SET DEFAULT '{}'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "centers" ALTER COLUMN "permissions" SET DEFAULT '{}'`);
    }

}
