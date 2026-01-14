import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { TestGeneratorService } from '../test-generator.service';

async function main() {
  const centerId = process.env.CENTER_ID ? Number(process.env.CENTER_ID) : 1;
  const page = process.env.PAGE ? Number(process.env.PAGE) : 1;
  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : 20;

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const service = app.get(TestGeneratorService);

    const result = await service.listResults({
      centerId,
      page,
      limit,
      q: process.env.Q,
      uniqueNumber: process.env.UNIQUE_NUMBER,
      from: process.env.FROM,
      to: process.env.TO,
      studentId: process.env.STUDENT_ID
        ? Number(process.env.STUDENT_ID)
        : undefined,
    });

    process.stdout.write(JSON.stringify(result, null, 2));
    process.stdout.write('\n');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
