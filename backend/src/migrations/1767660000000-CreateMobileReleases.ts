import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMobileReleases1767660000000 implements MigrationInterface {
  name = 'CreateMobileReleases1767660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."mobile_releases_platform_enum" AS ENUM ('android', 'ios');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mobile_releases" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "platform" "public"."mobile_releases_platform_enum" NOT NULL,
        "version" character varying NOT NULL,
        "originalFileName" character varying NOT NULL,
        "archiveFileName" character varying NOT NULL,
        "archiveRelativePath" character varying NOT NULL,
        "archiveSizeBytes" bigint NOT NULL DEFAULT '0',
        "uploadedByRole" character varying,
        "uploadedByUserId" integer,
        CONSTRAINT "PK_mobile_releases_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_mobile_releases_platform_version" UNIQUE ("platform", "version")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "mobile_releases";`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."mobile_releases_platform_enum";`,
    );
  }
}
