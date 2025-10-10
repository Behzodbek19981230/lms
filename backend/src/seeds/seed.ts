import { AppDataSource } from '../datasource';
import { DataSource, QueryRunner } from 'typeorm';

type IdRow = { id: number };

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function tableCount(qr: QueryRunner, table: string): Promise<number> {
  const r = (await qr.query(
    `SELECT COUNT(*)::int AS count FROM "${table}"`,
  )) as Array<{ count: number }>;
  return r?.[0]?.count ?? 0;
}

async function ensureEmptyOrExit(qr: QueryRunner, tables: string[]) {
  for (const t of tables) {
    const c = await tableCount(qr, t);
    if (c > 0) {
      console.log(
        `Table ${t} already has ${c} rows. Skipping seed to avoid duplicates.`,
      );
      console.log(
        'Tip: If you want to reseed, truncate tables first or add a reset mode.',
      );
      process.exit(0);
    }
  }
}

async function insertAndReturn(
  qr: QueryRunner,
  sql: string,
  params: unknown[] = [],
): Promise<IdRow[]> {
  const rows = (await qr.query(sql, params)) as IdRow[];
  return rows;
}

async function seed() {
  const FORCE =
    process.argv.includes('--force') || process.env.SEED_FORCE === '1';
  let ds: DataSource | undefined;
  let qr: QueryRunner | undefined;
  try {
    ds = await AppDataSource.initialize();
    qr = ds.createQueryRunner();
    await qr.connect();

    // Ensure migrations exist
    const hasMigrations = (await qr.query(
      `SELECT to_regclass('public.migrations') AS exists`,
    )) as Array<{ exists: string | null }>;
    if (!hasMigrations?.[0]?.exists) {
      console.error(
        'Migrations table not found. Please run `npm run migration:run` first.',
      );
      process.exit(1);
    }

    const coreTables = [
      'centers',
      'subjects',
      'users',
      'groups',
      'tests',
      'questions',
      'answers',
    ];

    for (const t of coreTables) {
      const exists = (await qr.query(
        `SELECT to_regclass('public.${t}') AS exists`,
      )) as Array<{ exists: string | null }>;
      if (!exists?.[0]?.exists) {
        console.error(
          `Table ${t} not found. Make sure migrations ran successfully.`,
        );
        process.exit(1);
      }
    }

    if (FORCE) {
      console.log('Force mode enabled: truncating tables and reseeding...');
      await qr.startTransaction();
      await qr.query(
        `TRUNCATE TABLE 
          exam_variant_questions,
          exam_variants,
          exams,
          exam_subjects,
          exam_groups,
          group_students,
          user_subjects,
          assigned_test_variants,
          assigned_tests,
          attendance,
          telegram_answers,
          pending_pdfs,
          generated_test_variants,
          generated_tests,
          payments,
          logs,
          notifications,
          answers,
          questions,
          tests,
          groups,
          users,
          subjects,
          centers
        RESTART IDENTITY CASCADE`,
      );
      await qr.commitTransaction();
    } else {
      await ensureEmptyOrExit(qr, coreTables);
    }

    await qr.startTransaction();

    // centers (10)
    await insertAndReturn(
      qr,
      `INSERT INTO centers (name, description, address, phone)
       SELECT 'Center ' || i, 'Description for center ' || i, 'Address ' || i, '+99890' || lpad(i::text, 7, '0')
       FROM generate_series(1, 10) AS s(i)
       RETURNING id`,
    );

    // subjects (10)
    await insertAndReturn(
      qr,
      `INSERT INTO subjects (name, description, category, "hasFormulas", "isActive", "testsCount", "centerId")
       SELECT 
         'Subject ' || i,
         'Description for subject ' || i,
         (ARRAY['exact_science','social_science','other'])[1 + (random()*2)::int]::subjects_category_enum,
         (random() > 0.5),
         true,
         0,
         (SELECT id FROM centers ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)
       RETURNING id`,
    );

    // users (teachers 10)
    await insertAndReturn(
      qr,
      `INSERT INTO users (username, password, "firstName", "lastName", phone, role, "isActive", "centerId", "telegramConnected")
       SELECT 
         'teacher' || i,
         '$2a$10$abcdefghijklmnopqrstuv',
         'TeacherFN' || i,
         'TeacherLN' || i,
         '+99890' || lpad(i::text, 7, '0'),
         'teacher'::users_role_enum,
         true,
         (SELECT id FROM centers ORDER BY random() LIMIT 1),
         false
       FROM generate_series(1, 10) AS s(i)
       RETURNING id`,
    );

    // users (students 10)
    await insertAndReturn(
      qr,
      `INSERT INTO users (username, password, "firstName", "lastName", phone, role, "isActive", "centerId", "telegramConnected")
       SELECT 
         'student' || i,
         '$2a$10$abcdefghijklmnopqrstuv',
         'StudentFN' || i,
         'StudentLN' || i,
         '+99891' || lpad(i::text, 7, '0'),
         'student'::users_role_enum,
         true,
         (SELECT id FROM centers ORDER BY random() LIMIT 1),
         false
       FROM generate_series(1, 10) AS s(i)
       RETURNING id`,
    );

    // groups (10)
    await insertAndReturn(
      qr,
      `INSERT INTO groups (name, description, "daysOfWeek", "startTime", "endTime", "subjectId", "teacherId", "centerId")
       SELECT 
         'Group ' || i,
         'Description for group ' || i,
         ARRAY['Mon','Wed','Fri'],
         '09:00',
         '10:30',
         (SELECT id FROM subjects ORDER BY random() LIMIT 1),
         (SELECT id FROM users WHERE role='teacher' ORDER BY random() LIMIT 1),
         (SELECT id FROM centers ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)
       RETURNING id`,
    );

    // tests (10)
    await insertAndReturn(
      qr,
      `INSERT INTO tests (title, description, type, status, duration, "totalQuestions", "totalPoints", "shuffleQuestions", "showResults", "teacherId", "subjectId")
       SELECT 
         'Test ' || i,
         'Description for test ' || i,
         (ARRAY['open','closed','mixed'])[1 + (random()*2)::int]::tests_type_enum,
         (ARRAY['draft','published','archived'])[1 + (random()*2)::int]::tests_status_enum,
         60,
         0,
         0,
         true,
         true,
         (SELECT id FROM users WHERE role='teacher' ORDER BY random() LIMIT 1),
         (SELECT id FROM subjects ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)
       RETURNING id`,
    );

    // questions (20)
    const questions = await insertAndReturn(
      qr,
      `INSERT INTO questions (text, explanation, type, points, "order", "hasFormula", "imageBase64", metadata, "testId")
       SELECT 
         'Question ' || i,
         'Explanation ' || i,
         (ARRAY['multiple_choice','true_false','essay','short_answer','fill_blank'])[1 + (random()*4)::int]::questions_type_enum,
         1,
         i,
         (random()>0.7),
         NULL,
         '{}',
         (SELECT id FROM tests ORDER BY random() LIMIT 1)
       FROM generate_series(1, 20) AS s(i)
       RETURNING id`,
    );

    // answers (4 per first 10 questions)
    const qIdsForAnswers = questions.slice(0, 10).map((r) => r.id);
    for (const qid of qIdsForAnswers) {
      const correctIndex = randInt(1, 4);
      await qr.query(
        `INSERT INTO answers (text, "isCorrect", "order", "hasFormula", explanation, "questionId") VALUES
         ($1, $2, 1, false, NULL, $5),
         ($3, $4, 2, false, NULL, $5),
         ('Option 3', false, 3, false, NULL, $5),
         ('Option 4', false, 4, false, NULL, $5)
        `,
        ['Option 1', correctIndex === 1, 'Option 2', correctIndex === 2, qid],
      );
    }

    // payments (10)
    await qr.query(
      `INSERT INTO payments (amount, status, "dueDate", description, "studentId", "groupId", "teacherId")
       SELECT 
         (10000 + (random()*90000))::numeric(10,2),
         (ARRAY['pending','paid','overdue','cancelled'])[1 + (random()*3)::int]::payments_status_enum,
         NOW()::date + (i||' days')::interval,
         'Payment ' || i,
         (SELECT id FROM users WHERE role='student' ORDER BY random() LIMIT 1),
         (SELECT id FROM groups ORDER BY random() LIMIT 1),
         (SELECT id FROM users WHERE role='teacher' ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)`,
    );

    // notifications (10)
    await qr.query(
      `INSERT INTO notifications (title, message, type, priority, "isRead", metadata, "userId")
       SELECT 
         'Notification ' || i,
         'Message for notification ' || i,
         (ARRAY['exam','test','grade','announcement','system'])[1 + (random()*4)::int]::notifications_type_enum,
         (ARRAY['low','medium','high','urgent'])[1 + (random()*3)::int]::notifications_priority_enum,
         (random()>0.6),
         '{}',
         (SELECT id FROM users ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)`,
    );

    // logs (10)
    await qr.query(
      `INSERT INTO logs (level, message, context, "userId", "userAgent", ip)
       SELECT 
         (ARRAY['log','error','warn','debug','verbose'])[1 + (random()*4)::int]::logs_level_enum,
         'Seed log message ' || i,
         'Seeder',
         (SELECT id FROM users ORDER BY random() LIMIT 1),
         'Mozilla/5.0',
         '127.0.0.1'
       FROM generate_series(1, 10) AS s(i)`,
    );

    // user_subjects (10 unique pairs)
    await qr.query(
      `WITH u AS (
         SELECT id, row_number() OVER() rn
         FROM (SELECT id FROM users ORDER BY random() LIMIT 10) t
       ), s AS (
         SELECT id, row_number() OVER() rn
         FROM (SELECT id FROM subjects ORDER BY random() LIMIT 10) t
       )
       INSERT INTO user_subjects ("userId", "subjectId")
       SELECT u.id, s.id FROM u JOIN s ON u.rn = s.rn`,
    );

    // group_students (10 unique pairs)
    await qr.query(
      `WITH g AS (
         SELECT id, row_number() OVER() rn
         FROM (SELECT id FROM groups ORDER BY random() LIMIT 10) t
       ), st AS (
         SELECT id, row_number() OVER() rn
         FROM (SELECT id FROM users WHERE role='student' ORDER BY random() LIMIT 10) t
       )
       INSERT INTO group_students ("groupId", "studentId")
       SELECT g.id, st.id FROM g JOIN st ON g.rn = st.rn`,
    );

    // assigned_tests (10)
    await insertAndReturn(
      qr,
      `INSERT INTO assigned_tests (title, "numQuestions", "shuffleAnswers", "baseTestId", "groupId", "teacherId")
       SELECT 
         'Assigned Test ' || i,
         10,
         true,
         (SELECT id FROM tests ORDER BY random() LIMIT 1),
         (SELECT id FROM groups ORDER BY random() LIMIT 1),
         (SELECT id FROM users WHERE role='teacher' ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)
       RETURNING id`,
    );

    // assigned_test_variants (10)
    await qr.query(
      `INSERT INTO assigned_test_variants ("variantNumber", "completedAt", payload, "assignedTestId", "studentId")
       SELECT 
         i,
         NULL,
         '{"v":1}',
         (SELECT id FROM assigned_tests ORDER BY random() LIMIT 1),
         (SELECT id FROM users WHERE role='student' ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)`,
    );

    // exams (10)
    await insertAndReturn(
      qr,
      `INSERT INTO exams (title, description, type, status, "examDate", "startTime", "endTime", duration, "shuffleQuestions", "shuffleAnswers", "variantsPerStudent", settings, "totalStudents", "totalQuestions", "totalPoints", "teacherId")
       SELECT 
         'Exam ' || i,
         'Description exam ' || i,
         (ARRAY['single_subject','block'])[1 + (random()*1)::int]::exams_type_enum,
         (ARRAY['draft','scheduled','in_progress','completed','cancelled'])[1 + (random()*4)::int]::exams_status_enum,
         NOW() + (i||' days')::interval,
         NOW(),
         NOW() + interval '2 hours',
         120,
         true,
         true,
         1,
         '{}',
         0,
         0,
         0,
         (SELECT id FROM users WHERE role='teacher' ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)
       RETURNING id`,
    );

    // exam_groups (10 unique pairs)
    await qr.query(
      `WITH e AS (
         SELECT id, row_number() OVER() rn
         FROM (SELECT id FROM exams ORDER BY random() LIMIT 10) t
       ), g AS (
         SELECT id, row_number() OVER() rn
         FROM (SELECT id FROM groups ORDER BY random() LIMIT 10) t
       )
       INSERT INTO exam_groups ("examId", "groupId")
       SELECT e.id, g.id FROM e JOIN g ON e.rn = g.rn`,
    );

    // exam_subjects (10 unique pairs)
    await qr.query(
      `WITH e AS (
         SELECT id, row_number() OVER() rn
         FROM (SELECT id FROM exams ORDER BY random() LIMIT 10) t
       ), s AS (
         SELECT id, row_number() OVER() rn
         FROM (SELECT id FROM subjects ORDER BY random() LIMIT 10) t
       )
       INSERT INTO exam_subjects ("examId", "subjectId")
       SELECT e.id, s.id FROM e JOIN s ON e.rn = s.rn`,
    );

    // exam_variants (10)
    await insertAndReturn(
      qr,
      `INSERT INTO exam_variants ("variantNumber", status, "startedAt", "completedAt", "submittedAt", score, "totalPoints", "correctAnswers", "totalQuestions", metadata, "questionPdfPath", "answerPdfPath", "resultPdfPath", "examId", "studentId")
       SELECT 
         'V' || i,
         (ARRAY['generated','started','in_progress','completed','submitted','graded'])[1 + (random()*5)::int]::exam_variants_status_enum,
         NOW(),
         NULL,
         NULL,
         0,
         0,
         0,
         0,
         '{}',
         NULL,
         NULL,
         NULL,
         (SELECT id FROM exams ORDER BY random() LIMIT 1),
         (SELECT id FROM users WHERE role='student' ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)
       RETURNING id`,
    );

    // exam_variant_questions (10)
    await qr.query(
      `INSERT INTO exam_variant_questions ("questionText", type, points, "order", "hasFormula", "answers", options, "correctAnswer", "studentAnswer", "correctAnswerIndex", "shuffledOrder", "subjectName", "subjectId", "examVariantId", "originalQuestionId")
       SELECT 
         'EVQ ' || i,
         'multiple_choice'::exam_variant_questions_type_enum,
         1,
         i,
         false,
         '[]',
         '{}',
         'A',
         NULL,
         1,
         '[]',
         'SubjectName',
         (SELECT id FROM subjects ORDER BY random() LIMIT 1),
         (SELECT id FROM exam_variants ORDER BY random() LIMIT 1),
         (SELECT id FROM questions ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)`,
    );

    // generated_tests (10)
    await qr.query(
      `INSERT INTO generated_tests (title, description, "variantCount", "questionCount", "timeLimit", difficulty, "includeAnswers", "showTitleSheet", "teacherId", "subjectId")
       SELECT 
         'Generated Test ' || i,
         'Description ' || i,
         2,
         10,
         60,
         'mixed',
         false,
         false,
         (SELECT id FROM users WHERE role='teacher' ORDER BY random() LIMIT 1),
         (SELECT id FROM subjects ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)`,
    );

    // generated_test_variants (10)
    await qr.query(
      `INSERT INTO generated_test_variants ("uniqueNumber", "variantNumber", "questionsData", "generatedAt", "generatedTestId")
       SELECT 
         'GT' || lpad(i::text, 8, '0'),
         i,
         '{"q":[]}',
         NOW(),
         (SELECT id FROM generated_tests ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)`,
    );

    // telegram_chats (10)
    await qr.query(
      `INSERT INTO telegram_chats ("chatId", type, status, title, username, "telegramUserId", "firstName", "lastName", "telegramUsername", "isBot", metadata, "inviteLink", "lastActivity", "userId", "centerId", "subjectId")
       SELECT 
         'chat_' || i,
         (ARRAY['channel','private','group'])[1 + (random()*2)::int]::telegram_chats_type_enum,
         (ARRAY['active','blocked','inactive','pending'])[1 + (random()*3)::int]::telegram_chats_status_enum,
         'Chat ' || i,
         'user' || i,
         'tg' || i,
         'FN' || i,
         'LN' || i,
         'tguser' || i,
         false,
         '{}',
         NULL,
         NOW(),
         (SELECT id FROM users ORDER BY random() LIMIT 1),
         (SELECT id FROM centers ORDER BY random() LIMIT 1),
         (SELECT id FROM subjects ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)`,
    );

    // pending_pdfs (10)
    await qr.query(
      `INSERT INTO pending_pdfs ("userId", type, status, "fileName", caption, metadata)
       SELECT 
         (SELECT id FROM users ORDER BY random() LIMIT 1),
         (ARRAY['exam_variant','assigned_test','exam_answer_key'])[1 + (random()*2)::int]::pending_pdfs_type_enum,
         (ARRAY['pending','sent','expired','failed'])[1 + (random()*3)::int]::pending_pdfs_status_enum,
         'file_' || i || '.pdf',
         'Caption ' || i,
         '{}'
       FROM generate_series(1, 10) AS s(i)`,
    );

    // telegram_answers (10)
    await qr.query(
      `INSERT INTO telegram_answers ("messageId", "testId", "questionNumber", "answerText", status, "isCorrect", "correctAnswer", points, "checkedAt", "submittedAt", metadata, "studentId", "chatId")
       SELECT 
         'msg_' || i,
         (SELECT id FROM tests ORDER BY random() LIMIT 1),
         (1 + (random()*5)::int),
         (ARRAY['A','B','C','D'])[1 + (random()*3)::int],
         (ARRAY['pending','checked','invalid'])[1 + (random()*2)::int]::telegram_answers_status_enum,
         (random()>0.5),
         (ARRAY['A','B','C','D'])[1 + (random()*3)::int],
         (0 + (random()*5)::int),
         NULL,
         NOW(),
         '{}',
         (SELECT id FROM users WHERE role='student' ORDER BY random() LIMIT 1),
         (SELECT id FROM telegram_chats ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)`,
    );

    // attendance (10)
    await qr.query(
      `INSERT INTO attendance (date, status, notes, "arrivedAt", "leftAt", "studentId", "groupId", "teacherId")
       SELECT 
         NOW()::date - (i||' days')::interval,
         (ARRAY['present','absent','late','excused'])[1 + (random()*3)::int]::attendance_status_enum,
         'Note ' || i,
         '09:00',
         '10:30',
         (SELECT id FROM users WHERE role='student' ORDER BY random() LIMIT 1),
         (SELECT id FROM groups ORDER BY random() LIMIT 1),
         (SELECT id FROM users WHERE role='teacher' ORDER BY random() LIMIT 1)
       FROM generate_series(1, 10) AS s(i)`,
    );

    await qr.commitTransaction();
    console.log(
      '✅ Seed completed successfully. Inserted at least 10 rows per main table.',
    );
  } catch (err) {
    console.error('❌ Seed failed:', err);
    try {
      await qr?.rollbackTransaction();
    } catch {
      // ignore
    }
    process.exit(1);
  } finally {
    try {
      await qr?.release();
      await ds?.destroy();
    } catch {
      // ignore
    }
  }
}

void seed();
