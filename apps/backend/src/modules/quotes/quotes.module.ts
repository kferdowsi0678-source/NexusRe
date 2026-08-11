import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { Quote } from '../submissions/entities/quote.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { SubmissionsModule } from '../submissions/submissions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quote, Organization]),
    SubmissionsModule,
    NotificationsModule,
  ],
  providers: [QuotesService],
  controllers: [QuotesController],
  exports: [QuotesService],
})
export class QuotesModule {}
