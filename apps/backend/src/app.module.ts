import { Module } from '@nestjs/common'; 
import { ConfigModule, ConfigService } from '@nestjs/config'; 
import { TypeOrmModule } from '@nestjs/typeorm'; 
import { AuthModule } from './modules/auth/auth.module'; 
import { UsersModule } from './modules/users/users.module'; 
import { OrganizationsModule } from './modules/organizations/organizations.module'; 
import { SubmissionsModule } from './modules/submissions/submissions.module'; 
import { StorageModule } from './modules/storage/storage.module';
import { FormsModule } from './modules/forms/forms.module'; 
import { PublicModule } from './modules/public/public.module';
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
        type: 'postgres', 
        host: configService.get('DB_HOST'), 
        port: configService.get('DB_PORT'), 
        username: configService.get('DB_USERNAME'), 
        password: configService.get('DB_PASSWORD'), 
        database: configService.get('DB_NAME'), 
        autoLoadEntities: true, 
        synchronize: false, 
        logging: configService.get('NODE_ENV') === 'development', 
      }), 
      inject: [ConfigService], 
    }), 
    StorageModule, 
    AuthModule, 
    UsersModule, 
    OrganizationsModule, 
    SubmissionsModule,
    FormsModule,
    PublicModule, 
  ], 
}) 
export class AppModule {}