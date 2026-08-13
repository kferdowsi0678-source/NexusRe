import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentExtraction } from './entities/document-extraction.entity';
import { SubmissionDocument } from '../submissions/entities/submission-document.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { SubmissionsModule } from '../submissions/submissions.module';
import { StorageModule } from '../storage/storage.module';
import { ExtractionService } from './extraction.service';
import { ExtractionController } from './extraction.controller';
import { DocumentIntelligenceService } from './document-intelligence.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentExtraction, SubmissionDocument, Submission]),
    SubmissionsModule,
    StorageModule,
  ],
  providers: [ExtractionService, DocumentIntelligenceService],
  controllers: [ExtractionController],
  exports: [ExtractionService, DocumentIntelligenceService],
})
export class ExtractionModule {}
