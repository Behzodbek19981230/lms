import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { TelegramModule } from './telegram/telegram.module';
import { TestsModule } from './tests/tests.module';
import { QuestionsModule } from './questions/questions.module';
import { UsersModule } from './users/users.module';
import { SubjectsModule } from './subjects/subjects.module';
import { CentersModule } from './centers/centers.module';
import { GroupsModule } from './groups/groups.module';
import { ExamsModule } from './exams/exams.module';
import { StudentsModule } from './students/students.module';
import { CronJobsModule } from './cron-jobs/cron-jobs.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PaymentsModule } from './payments/payments.module';
import { AssignedTestsModule } from './assigned-tests/assigned-tests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LogsModule } from './logs/logs.module';
import { ContactsModule } from './contacts/contacts.module';
import { CenterPermissionGuard } from './centers/permissions/center-permission.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'postgres'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
        migrations: ['dist/migrations/*.js'],
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    SubjectsModule,
    TestsModule,
    QuestionsModule,
    CentersModule,
    NotificationsModule,
    GroupsModule,
    AssignedTestsModule,
    ExamsModule,
    StudentsModule,
    TelegramModule,
    PaymentsModule,
    AttendanceModule,
    CronJobsModule,
    LogsModule,
    ContactsModule,
  ],
  providers: [
    // Global center-permission guard: only enforces when @RequireCenterPermissions() is present
    { provide: APP_GUARD, useClass: CenterPermissionGuard },
  ],
})
export class AppModule {}
