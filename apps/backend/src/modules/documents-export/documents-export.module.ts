import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsExportController } from './documents-export.controller';
import { PlacementSlipService } from './placement-slip.service';
import { Organization } from '../organizations/entities/organization.entity';
import { SubmissionsModule } from '../submissions/submissions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Organization]), SubmissionsModule],
  providers: [PlacementSlipService],
  controllers: [DocumentsExportController],
  exports: [PlacementSlipService],
})
export class DocumentsExportModule {}
