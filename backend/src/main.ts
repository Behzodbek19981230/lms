import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { CustomLogger } from './logs/custom-logger';
import * as express from 'express';
import { join } from 'path';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const customLogger = app.get(CustomLogger);
  app.useLogger(customLogger);

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

  app.use(
    '/uploads',
    express.static(join(__dirname, '..', 'public', 'uploads')),
  );
  app.use('/print', express.static(join(__dirname, '..', 'public', 'uploads')));

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
