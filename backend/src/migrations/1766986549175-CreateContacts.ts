import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateContacts1766986549175 implements MigrationInterface {
    name = 'CreateContacts1766986549175'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "centers" ALTER COLUMN "permissions" SET DEFAULT '{}'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "centers" ALTER COLUMN "permissions" SET DEFAULT '{}'`);
    }

}
