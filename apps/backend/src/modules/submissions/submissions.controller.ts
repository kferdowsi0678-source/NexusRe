import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubmissionStatus } from './entities/submission.entity';

@ApiTags('submissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new submission' })
  create(@Body() createSubmissionDto: CreateSubmissionDto, @Request() req) {
    return this.submissionsService.create(createSubmissionDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all submissions' })
  @ApiQuery({ name: 'organizationId', required: false })
  findAll(@Query('organizationId') organizationId?: string) {
    return this.submissionsService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get submission by ID' })
  findOne(@Param('id') id: string) {
    return this.submissionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update submission' })
  update(
    @Param('id') id: string,
    @Body() updateSubmissionDto: UpdateSubmissionDto,
    @Request() req,
  ) {
    return this.submissionsService.update(id, updateSubmissionDto, req.user.userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update submission status' })
  updateStatus(@Param('id') id: string, @Body('status') status: SubmissionStatus) {
    return this.submissionsService.updateStatus(id, status);
  }

  @Post(':id/calculate-score')
  @ApiOperation({ summary: 'Calculate completeness score' })
  calculateScore(@Param('id') id: string) {
    return this.submissionsService.calculateCompletenessScore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete submission' })
  remove(@Param('id') id: string, @Request() req) {
    return this.submissionsService.remove(id, req.user.userId);
  }
}
