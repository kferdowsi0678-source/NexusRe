import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CustomThrottle } from '../../common/decorators/throttle.decorator';
import { RoleType } from '../users/entities/role.entity';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request';
import { ExtractionService } from './extraction.service';
import { CreateExtractionDto, ReviewExtractionDto } from './dto/review-extraction.dto';

/** Roles that own a submission and may therefore correct its extracted data. */
const OWNER_ROLES = [
  RoleType.CEDANT_USER,
  RoleType.BROKER_USER,
  RoleType.ORG_ADMIN,
  RoleType.SUPER_ADMIN,
] as const;

@ApiTags('document-extraction')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('submissions/:submissionId/extractions')
export class ExtractionController {
  constructor(private readonly extractionService: ExtractionService) {}

  @Post()
  @Roles(...OWNER_ROLES)
  // Extraction is expensive and calls an external model; a much tighter limit
  // than the global 100/min keeps a stuck client from burning through quota.
  @CustomThrottle(10, 60)
  @ApiOperation({ summary: 'Read a document and propose structured risk fields' })
  @ApiResponse({ status: 201, description: 'Extraction run, with fields awaiting review' })
  @ApiResponse({ status: 400, description: 'Document type cannot be read by the extractor' })
  extract(
    @Param('submissionId') submissionId: string,
    @Body() dto: CreateExtractionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.extractionService.extractDocument(submissionId, dto.documentId, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'List extraction runs for a submission, newest first' })
  findAll(
    @Param('submissionId') submissionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.extractionService.findForSubmission(submissionId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one extraction run with its fields' })
  findOne(
    @Param('submissionId') submissionId: string,
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.extractionService.findOne(submissionId, id, req.user);
  }

  @Patch(':id/review')
  @Roles(...OWNER_ROLES)
  @ApiOperation({ summary: 'Accept, edit or reject individual extracted fields' })
  @ApiResponse({ status: 400, description: 'A decision referenced a field not in this run' })
  review(
    @Param('submissionId') submissionId: string,
    @Param('id') id: string,
    @Body() dto: ReviewExtractionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.extractionService.review(submissionId, id, dto, req.user);
  }

  @Post(':id/apply')
  @Roles(...OWNER_ROLES)
  @ApiOperation({
    summary: 'Write reviewed fields into the submission and recompute completeness',
  })
  @ApiResponse({ status: 400, description: 'Nothing has been accepted yet' })
  apply(
    @Param('submissionId') submissionId: string,
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.extractionService.apply(submissionId, id, req.user);
  }
}
