import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '../users/entities/role.entity';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request';

@ApiTags('quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post('submissions/:submissionId/quotes')
  @Roles(RoleType.REINSURER_UNDERWRITER, RoleType.REINSURER_ADMIN)
  @ApiOperation({ summary: 'Issue a quote against a submission (reinsurers only)' })
  create(
    @Param('submissionId') submissionId: string,
    @Body() dto: CreateQuoteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.quotesService.create(submissionId, dto, req.user);
  }

  @Get('submissions/:submissionId/quotes')
  @ApiOperation({ summary: 'List quotes on a submission' })
  findForSubmission(
    @Param('submissionId') submissionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.quotesService.findForSubmission(submissionId, req.user);
  }

  @Get('submissions/:submissionId/quotes/comparison')
  @ApiOperation({ summary: 'Quote comparison matrix (ceding side only)' })
  comparison(
    @Param('submissionId') submissionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.quotesService.comparisonMatrix(submissionId, req.user);
  }

  @Get('quotes/:id')
  @ApiOperation({ summary: 'Get a single quote' })
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.quotesService.findOne(id, req.user);
  }

  @Patch('quotes/:id/status')
  @ApiOperation({ summary: 'Move a quote through its lifecycle' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateQuoteStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.quotesService.updateStatus(id, dto, req.user);
  }
}
