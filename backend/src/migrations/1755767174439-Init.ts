import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1755767174439 implements MigrationInterface {
    name = 'Init1755767174439'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "answers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "text" character varying NOT NULL, "isCorrect" boolean NOT NULL DEFAULT false, "order" integer NOT NULL DEFAULT '0', "hasFormula" boolean NOT NULL DEFAULT false, "explanation" character varying, "questionId" uuid, CONSTRAINT "PK_9c32cec6c71e06da0254f2226c6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."questions_type_enum" AS ENUM('multiple_choice', 'true_false', 'essay', 'short_answer', 'fill_blank')`);
        await queryRunner.query(`CREATE TABLE "questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "text" character varying NOT NULL, "explanation" character varying, "type" "public"."questions_type_enum" NOT NULL DEFAULT 'multiple_choice', "points" integer NOT NULL DEFAULT '1', "order" integer NOT NULL DEFAULT '0', "hasFormula" boolean NOT NULL DEFAULT false, "imageBase64" text, "metadata" json, "testId" uuid, CONSTRAINT "PK_08a6d4b0f49ff300bf3a0ca60ac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."tests_type_enum" AS ENUM('open', 'closed', 'mixed')`);
        await queryRunner.query(`CREATE TYPE "public"."tests_status_enum" AS ENUM('draft', 'published', 'archived')`);
        await queryRunner.query(`CREATE TABLE "tests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying NOT NULL, "description" character varying, "type" "public"."tests_type_enum" NOT NULL DEFAULT 'open', "status" "public"."tests_status_enum" NOT NULL DEFAULT 'draft', "duration" integer NOT NULL DEFAULT '60', "totalQuestions" integer NOT NULL DEFAULT '0', "totalPoints" integer NOT NULL DEFAULT '0', "shuffleQuestions" boolean NOT NULL DEFAULT true, "showResults" boolean NOT NULL DEFAULT true, "teacherId" uuid, "subjectId" uuid, CONSTRAINT "PK_4301ca51edf839623386860aed2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "teachers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "password" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "phone" character varying, "isActive" boolean NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMP, CONSTRAINT "UQ_7568c49a630907119e4a665c605" UNIQUE ("email"), CONSTRAINT "PK_a8d4f83be3abe4c687b0a0093c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."subjects_category_enum" AS ENUM('mathematics', 'physics', 'chemistry', 'biology', 'language', 'literature', 'history', 'geography', 'computer_science', 'other')`);
        await queryRunner.query(`CREATE TABLE "subjects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "description" character varying, "category" "public"."subjects_category_enum" NOT NULL DEFAULT 'other', "hasFormulas" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "testsCount" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_1a023685ac2b051b4e557b0b280" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('teacher', 'student', 'admin')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "password" character varying NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "phone" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'teacher', "isActive" boolean NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "teacher_subjects" ("teacherId" uuid NOT NULL, "subjectId" uuid NOT NULL, CONSTRAINT "PK_8e762322ca7fbbe06ab8eb1ea6e" PRIMARY KEY ("teacherId", "subjectId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2013034e3c170743cbd5fda6de" ON "teacher_subjects" ("teacherId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8b5bb4420cea1e9e5a988ec3e1" ON "teacher_subjects" ("subjectId") `);
        await queryRunner.query(`CREATE TABLE "user_subjects" ("userId" uuid NOT NULL, "subjectId" uuid NOT NULL, CONSTRAINT "PK_76e76942dde6cdee5103ecd0067" PRIMARY KEY ("userId", "subjectId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e5b3b91e12265bb1cf01c2dbb4" ON "user_subjects" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b8ffeeaa5df97da742b636e027" ON "user_subjects" ("subjectId") `);
        await queryRunner.query(`ALTER TABLE "answers" ADD CONSTRAINT "FK_c38697a57844f52584abdb878d7" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "questions" ADD CONSTRAINT "FK_94296641072b0f034d14e272cc6" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tests" ADD CONSTRAINT "FK_7f83dda887820244f729fe7e4c0" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tests" ADD CONSTRAINT "FK_910215de6563cf9f350eeb60a1d" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "teacher_subjects" ADD CONSTRAINT "FK_2013034e3c170743cbd5fda6de9" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "teacher_subjects" ADD CONSTRAINT "FK_8b5bb4420cea1e9e5a988ec3e11" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_subjects" ADD CONSTRAINT "FK_e5b3b91e12265bb1cf01c2dbb44" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_subjects" ADD CONSTRAINT "FK_b8ffeeaa5df97da742b636e027b" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_subjects" DROP CONSTRAINT "FK_b8ffeeaa5df97da742b636e027b"`);
        await queryRunner.query(`ALTER TABLE "user_subjects" DROP CONSTRAINT "FK_e5b3b91e12265bb1cf01c2dbb44"`);
        await queryRunner.query(`ALTER TABLE "teacher_subjects" DROP CONSTRAINT "FK_8b5bb4420cea1e9e5a988ec3e11"`);
        await queryRunner.query(`ALTER TABLE "teacher_subjects" DROP CONSTRAINT "FK_2013034e3c170743cbd5fda6de9"`);
        await queryRunner.query(`ALTER TABLE "tests" DROP CONSTRAINT "FK_910215de6563cf9f350eeb60a1d"`);
        await queryRunner.query(`ALTER TABLE "tests" DROP CONSTRAINT "FK_7f83dda887820244f729fe7e4c0"`);
        await queryRunner.query(`ALTER TABLE "questions" DROP CONSTRAINT "FK_94296641072b0f034d14e272cc6"`);
        await queryRunner.query(`ALTER TABLE "answers" DROP CONSTRAINT "FK_c38697a57844f52584abdb878d7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b8ffeeaa5df97da742b636e027"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e5b3b91e12265bb1cf01c2dbb4"`);
        await queryRunner.query(`DROP TABLE "user_subjects"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b5bb4420cea1e9e5a988ec3e1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2013034e3c170743cbd5fda6de"`);
        await queryRunner.query(`DROP TABLE "teacher_subjects"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "subjects"`);
        await queryRunner.query(`DROP TYPE "public"."subjects_category_enum"`);
        await queryRunner.query(`DROP TABLE "teachers"`);
        await queryRunner.query(`DROP TABLE "tests"`);
        await queryRunner.query(`DROP TYPE "public"."tests_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tests_type_enum"`);
        await queryRunner.query(`DROP TABLE "questions"`);
        await queryRunner.query(`DROP TYPE "public"."questions_type_enum"`);
        await queryRunner.query(`DROP TABLE "answers"`);
    }

}
