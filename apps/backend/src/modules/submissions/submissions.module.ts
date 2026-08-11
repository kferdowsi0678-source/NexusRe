import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { Submission } from './entities/submission.entity';
import { SubmissionDocument } from './entities/submission-document.entity';
import { Quote } from './entities/quote.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, SubmissionDocument, Quote]),
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  ],
  providers: [SubmissionsService],
  controllers: [SubmissionsController],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
