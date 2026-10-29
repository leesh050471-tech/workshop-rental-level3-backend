import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Client } from 'pg';
import { AppModule } from './app.module';

async function ensureSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${process.env.DB_SCHEMA || 'level3'}"`);
  await client.end();
}

async function bootstrap() {
  await ensureSchema();
  const app = await NestFactory.create(AppModule);
  const origins = (process.env.FRONTEND_URL || 'http://localhost:3001')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''));
  app.enableCors({ origin: origins });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        const fields: Record<string, string> = {};
        for (const e of errors) fields[e.property] = Object.values(e.constraints || {})[0];
        return new BadRequestException({ message: '입력한 내용을 다시 확인해 주세요.', fields });
      },
    }),
  );
  await app.listen(process.env.PORT || 4001, '0.0.0.0');
}
bootstrap();
