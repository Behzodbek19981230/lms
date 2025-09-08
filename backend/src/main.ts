import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { CustomLogger } from './logs/custom-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    .setTitle('EduNimbus Connect API')
    .setDescription(
      'Backend API for EduNimbus  - Teacher Test Creation Platform',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3004;
  await app.listen(port);
  console.log(`🚀 EduNimbus Backend running on http://localhost:${port}`);

  //   customLogger.log(
  //     `🚀 EduNimbus Backend running on http://localhost:${port}`,
  //     'Bootstrap',
  //   );
  //   customLogger.log(
  //     `📚 API Documentation: http://localhost:${port}/api/docs`,
  //     'Bootstrap',
  //   );
}
bootstrap();
