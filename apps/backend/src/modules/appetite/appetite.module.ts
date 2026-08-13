import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppetiteService } from './appetite.service';
import { MarketIntelligenceService } from './market-intelligence.service';
import { AppetiteController } from './appetite.controller';
import { RiskAppetite } from './entities/risk-appetite.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Submission } from '../submissions/entities/submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RiskAppetite, Organization, Submission])],
  providers: [AppetiteService, MarketIntelligenceService],
  controllers: [AppetiteController],
  exports: [AppetiteService, MarketIntelligenceService],
})
export class AppetiteModule {}
