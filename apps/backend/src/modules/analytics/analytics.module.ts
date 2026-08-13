import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Submission } from '../submissions/entities/submission.entity';
import { Quote } from '../submissions/entities/quote.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Submission, Quote])],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
