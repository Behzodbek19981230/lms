import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeExamVariantNumbers1730599999999
  implements MigrationInterface
{
  name = 'NormalizeExamVariantNumbers1730599999999';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Gather all existing 10-digit codes from generated_test_variants to avoid collisions
    const genRows: Array<{ uniqueNumber: string }> = await queryRunner.query(
      'SELECT "uniqueNumber" FROM "generated_test_variants" WHERE char_length("uniqueNumber") = 10 AND "uniqueNumber" ~ \'^[0-9]+$\'',
    );
    const usedCodes = new Set<string>(genRows.map((r) => r.uniqueNumber));

    // Load all exam variants (id and variantNumber)
    const examRows: Array<{ id: number; variantNumber: string | null }> =
      await queryRunner.query(
        'SELECT id, "variantNumber" FROM "exam_variants"',
      );

    // Helper to check 10-digit numeric
    const isTenDigit = (v: string | null | undefined) =>
      !!v && /^\d{10}$/.test(v);

    // Track duplicates in exam_variants and collisions with generated_test_variants
    const seenExam = new Set<string>();
    const toFix: Array<{ id: number }> = [];

    for (const row of examRows) {
      const v = row.variantNumber ?? '';
      const invalid = !isTenDigit(v);
      const dup = isTenDigit(v) && (usedCodes.has(v) || seenExam.has(v));
      if (invalid || dup) {
        toFix.push({ id: row.id });
      } else if (isTenDigit(v)) {
        usedCodes.add(v);
        seenExam.add(v);
      }
    }

    // Function to generate a random 10-digit numeric string not in usedCodes
    const genCode = (): string => {
      let s = '';
      for (let i = 0; i < 10; i++)
        s += Math.floor(Math.random() * 10).toString();
      // Avoid leading zeros resulting in ambiguous formatting; but zeros are allowed, so keep as-is.
      return s;
    };

    // Assign new unique codes for all to-fix rows
    for (const row of toFix) {
      let code: string;
      do {
        code = genCode();
      } while (usedCodes.has(code));
      usedCodes.add(code);
      await queryRunner.query(
        'UPDATE "exam_variants" SET "variantNumber" = $1 WHERE id = $2',
        [code, row.id],
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible safely: we cannot reconstruct prior values
    return;
  }
}
