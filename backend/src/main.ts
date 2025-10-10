import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { CustomLogger } from './logs/custom-logger';

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
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('EduOne Connect API')
    .setDescription('Backend API for EduOne  - Teacher Test Creation Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3003;
  await app.listen(port);
}

bootstrap();
