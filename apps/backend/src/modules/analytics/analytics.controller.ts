import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRangeDto } from './dto/analytics-range.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request';

/**
 * Every figure returned here is scoped to what the caller may already see one
 * submission at a time: no role check is skipped by aggregating.
 */
@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Pipeline counts, quote volume, completeness and conversion' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  overview(@Query() range: AnalyticsRangeDto, @Request() req: AuthenticatedRequest) {
    return this.analyticsService.overview(req.user, range);
  }

  @Get('time-to-quote')
  @ApiOperation({ summary: 'Hours from submission to first quote, overall and per line' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  timeToQuote(@Query() range: AnalyticsRangeDto, @Request() req: AuthenticatedRequest) {
    return this.analyticsService.timeToQuote(req.user, range);
  }

  @Get('volume')
  @ApiOperation({ summary: 'Submissions per month for the last 12 months by line of business' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  volume(@Query() range: AnalyticsRangeDto, @Request() req: AuthenticatedRequest) {
    return this.analyticsService.volume(req.user, range);
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Submissions reaching each stage of the status lifecycle' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  funnel(@Query() range: AnalyticsRangeDto, @Request() req: AuthenticatedRequest) {
    return this.analyticsService.funnel(req.user, range);
  }
}
