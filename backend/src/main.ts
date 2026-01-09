import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
// import { CustomLogger } from './logs/custom-logger';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //   const customLogger = app.get(CustomLogger);
  //   app.useLogger(customLogger);

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // Set global prefix
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
    credentials: true,
  });

  // Static file serving for uploads and print (HTML/PDF)

  // Prefer process.cwd() (works for prod when running `node dist/src/main` from backend folder)
  // Fallback to dist-relative path for safety.
  const uploadsDirCandidates = [
    join(process.cwd(), 'public', 'uploads'),
    join(process.cwd(), 'dist', 'public', 'uploads'),
    join(__dirname, '..', 'public', 'uploads'),
    join(__dirname, 'public', 'uploads'),
  ];

  const uploadDirs = Array.from(
    new Set(
      uploadsDirCandidates.filter((p) => {
        try {
          return fs.existsSync(p);
        } catch {
          return false;
        }
      }),
    ),
  );

  // Fall back to first candidate if none exist yet
  const dirsToServe = uploadDirs.length
    ? uploadDirs
    : [uploadsDirCandidates[0]];
  for (const dir of dirsToServe) {
    app.use('/uploads', express.static(dir));
    app.use('/print', express.static(dir));
  }

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('EduNimbus Connect API')
    .setDescription(
      'Backend API for EduNimbus  - Teacher Test Creation Platform',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3003;
  await app.listen(port);
}
void bootstrap();
