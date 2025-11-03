import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExamVariantNumber10Digits1730600000000
  implements MigrationInterface
{
  name = 'ExamVariantNumber10Digits1730600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Shrink column to VARCHAR(10) and enforce NOT NULL
    await queryRunner.query(
      'ALTER TABLE "exam_variants" ALTER COLUMN "variantNumber" TYPE varchar(10)',
    );
    await queryRunner.query(
      'ALTER TABLE "exam_variants" ALTER COLUMN "variantNumber" SET NOT NULL',
    );

    // Drop existing check if present, then add the strict 10-digit numeric check
    await queryRunner.query(
      'ALTER TABLE "exam_variants" DROP CONSTRAINT IF EXISTS "CHK_exam_variant_number_10digits"',
    );
    await queryRunner.query(
      'ALTER TABLE "exam_variants" ADD CONSTRAINT "CHK_exam_variant_number_10digits" CHECK ("variantNumber" IS NOT NULL AND char_length("variantNumber") = 10 AND "variantNumber" ~ \'^[0-9]+$\')',
    );

    // Ensure unique index exists (created by entity), but add defensively if missing
    await queryRunner.query(
      'DO $$ BEGIN\n' +
        'IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = ANY (current_schemas(false)) AND indexname = ' +
        "'IDX_exam_variants_variantNumber_unique') THEN\n" +
        '  CREATE UNIQUE INDEX "IDX_exam_variants_variantNumber_unique" ON "exam_variants" ("variantNumber");\n' +
        'END IF;\n' +
        'END $$;',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the check constraint
    await queryRunner.query(
      'ALTER TABLE "exam_variants" DROP CONSTRAINT IF EXISTS "CHK_exam_variant_number_10digits"',
    );

    // Widen column back to a generic VARCHAR(255)
    await queryRunner.query(
      'ALTER TABLE "exam_variants" ALTER COLUMN "variantNumber" TYPE varchar(255)',
    );
  }
}
