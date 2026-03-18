import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const internalApiKey = process.env.INTERNAL_API_KEY?.trim();
  const configuredFrontendOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : null;

  app.use((request: Request, response: Response, next: NextFunction) => {
    if (!internalApiKey || !request.path.startsWith('/api')) {
      next();
      return;
    }

    const gatewayApiKey = request.header('x-internal-api-key')?.trim();

    if (gatewayApiKey !== internalApiKey) {
      response.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  });

  app.enableCors({
    origin: configuredFrontendOrigins
      ? configuredFrontendOrigins.length > 0
        ? configuredFrontendOrigins
        : false
      : true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
