import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { StorageModule } from './modules/storage/storage.module';
import { FormsModule } from './modules/forms/forms.module';
import { PublicModule } from './modules/public/public.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { AppetiteModule } from './modules/appetite/appetite.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { EmailModule } from './modules/email/email.module';
import { ExtractionModule } from './modules/extraction/extraction.module';
import { DocumentsExportModule } from './modules/documents-export/documents-export.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { validationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    // Global rate limit. Per-route overrides use @CustomThrottle / @SkipThrottle.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: (configService.get<number>('THROTTLE_TTL') ?? 60) * 1000,
          limit: configService.get<number>('THROTTLE_LIMIT') ?? 100,
        },
      ],
      inject: [ConfigService],
    }),
    StorageModule,
    EmailModule,
    AuditModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    SubmissionsModule,
    FormsModule,
    PublicModule,
    NotificationsModule,
    QuotesModule,
    AppetiteModule,
    MessagingModule,
    ExtractionModule,
    DocumentsExportModule,
    AnalyticsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Logging wraps auditing so a slow audit write is visible in the timing.
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Runs before guards and interceptors so every log line and error envelope
    // downstream can quote the same correlation id.
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
