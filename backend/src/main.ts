import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { CustomLogger } from './logs/custom-logger';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
  });

  const customLogger = app.get(CustomLogger);
  app.useLogger(customLogger);

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // Set global prefix
  app.setGlobalPrefix('api');

  // Serve static HTML printables at /print/* with permissive CORS headers
  const staticHeaders = (res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );
    // Helpful when embedding across origins
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  };
  // - In prod (compiled): files under dist/public
  app.useStaticAssets(join(__dirname, 'public'), {
    prefix: '/print/',
    setHeaders: staticHeaders,
  });
  // - In dev (ts-node): also serve project-root/public
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/print/',
    setHeaders: staticHeaders,
  });

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

void bootstrap();
