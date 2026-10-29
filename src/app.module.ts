import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AiService } from './ai.service';
import { AuthGuard } from './auth';
import { Equipment, Inquiry, Reservation, User } from './entities';
import { ReservationsService } from './reservations.service';
import { SeedService } from './seed.service';

const entities = [User, Equipment, Reservation, Inquiry];

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      schema: process.env.DB_SCHEMA || 'level3',
      entities,
      synchronize: true,
    }),
    TypeOrmModule.forFeature(entities),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-only-secret',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AppController],
  providers: [ReservationsService, AiService, SeedService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
