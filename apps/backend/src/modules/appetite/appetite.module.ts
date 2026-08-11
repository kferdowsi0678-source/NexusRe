import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppetiteService } from './appetite.service';
import { AppetiteController } from './appetite.controller';
import { RiskAppetite } from './entities/risk-appetite.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Submission } from '../submissions/entities/submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RiskAppetite, Organization, Submission])],
  providers: [AppetiteService],
  controllers: [AppetiteController],
  exports: [AppetiteService],
})
export class AppetiteModule {}
