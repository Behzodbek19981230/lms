import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCenterIdToTelegramMessageLog1766991711967 implements MigrationInterface {
    name = 'AddCenterIdToTelegramMessageLog1766991711967'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "telegram_message_logs" ADD "centerId" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_telegram_message_logs_center_id" ON "telegram_message_logs" ("centerId")`);
        await queryRunner.query(`ALTER TABLE "telegram_message_logs" ADD CONSTRAINT "FK_telegram_message_logs_center_id" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "telegram_message_logs" DROP CONSTRAINT "FK_telegram_message_logs_center_id"`);
        await queryRunner.query(`DROP INDEX "IDX_telegram_message_logs_center_id"`);
        await queryRunner.query(`ALTER TABLE "telegram_message_logs" DROP COLUMN "centerId"`);
    }

}
