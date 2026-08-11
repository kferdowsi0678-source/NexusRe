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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { UploadDocumentDto, GetPresignedUploadUrlDto } from './dto/upload-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubmissionStatus } from './entities/submission.entity';
import { StorageService } from '../storage/storage.service';

@ApiTags('submissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly storageService: StorageService,
  ) {}

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

  @Post(':id/documents/upload')
  @ApiOperation({ summary: 'Upload document to submission' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: { type: 'string', enum: Object.values(['risk_survey', 'loss_history', 'financials', 'wordings', 'claims_documentation', 'other']) },
        description: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadDocumentDto,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!this.storageService.validateFileType(file.mimetype)) {
      throw new BadRequestException('Invalid file type');
    }

    if (!this.storageService.validateFileSize(file.size)) {
      throw new BadRequestException('File size exceeds 50MB limit');
    }

    return this.submissionsService.uploadDocument(
      id,
      file,
      uploadDto.category,
      uploadDto.description,
      req.user.userId,
    );
  }

  @Post('documents/presigned-url')
  @ApiOperation({ summary: 'Get presigned URL for document upload' })
  async getPresignedUploadUrl(@Body() dto: GetPresignedUploadUrlDto) {
    return this.storageService.getPresignedUploadUrl(
      dto.fileName,
      dto.submissionId,
      dto.category,
      dto.contentType,
    );
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get all documents for a submission' })
  async getDocuments(@Param('id') id: string) {
    return this.submissionsService.getDocuments(id);
  }

  @Get('documents/:documentId/download-url')
  @ApiOperation({ summary: 'Get presigned download URL for document' })
  async getDocumentDownloadUrl(@Param('documentId') documentId: string) {
    return this.submissionsService.getDocumentDownloadUrl(documentId);
  }

  @Delete('documents/:documentId')
  @ApiOperation({ summary: 'Delete document' })
  async deleteDocument(@Param('documentId') documentId: string, @Request() req) {
    return this.submissionsService.deleteDocument(documentId, req.user.userId);
  }
}
