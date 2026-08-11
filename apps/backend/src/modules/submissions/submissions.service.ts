import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission, SubmissionStatus } from './entities/submission.entity';
import { SubmissionDocument } from './entities/submission-document.entity';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { StorageService, DocumentCategory } from '../storage/storage.service';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
    @InjectRepository(SubmissionDocument)
    private documentsRepository: Repository<SubmissionDocument>,
    private storageService: StorageService,
  ) {}

  async create(createSubmissionDto: CreateSubmissionDto, userId: string): Promise<Submission> {
    const submission = this.submissionsRepository.create({
      ...createSubmissionDto,
      submittedById: userId,
      status: SubmissionStatus.DRAFT,
    });

    return this.submissionsRepository.save(submission);
  }

  async findAll(organizationId?: string): Promise<Submission[]> {
    const query = this.submissionsRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.cedant', 'cedant')
      .leftJoinAndSelect('submission.submittedBy', 'submittedBy')
      .leftJoinAndSelect('submission.documents', 'documents')
      .orderBy('submission.createdAt', 'DESC');

    if (organizationId) {
      query.where('submission.cedantId = :organizationId', { organizationId });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<Submission> {
    const submission = await this.submissionsRepository.findOne({
      where: { id },
      relations: ['cedant', 'submittedBy', 'documents', 'quotes', 'quotes.reinsurer'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }

  async update(
    id: string,
    updateSubmissionDto: UpdateSubmissionDto,
    userId: string,
  ): Promise<Submission> {
    const submission = await this.findOne(id);

    // Basic access control - can be enhanced with proper RBAC
    if (submission.submittedById !== userId) {
      throw new ForbiddenException('You do not have permission to update this submission');
    }

    Object.assign(submission, updateSubmissionDto);
    return this.submissionsRepository.save(submission);
  }

  async updateStatus(id: string, status: SubmissionStatus): Promise<Submission> {
    const submission = await this.findOne(id);
    submission.status = status;

    if (status === SubmissionStatus.SUBMITTED && !submission.submittedAt) {
      submission.submittedAt = new Date();
    }

    return this.submissionsRepository.save(submission);
  }

  async calculateCompletenessScore(id: string): Promise<number> {
    const submission = await this.findOne(id);
    let score = 0;
    const maxScore = 100;

    // Basic scoring logic
    if (submission.title) score += 10;
    if (submission.description) score += 15;
    if (submission.sumInsured) score += 15;
    if (submission.inceptionDate && submission.expiryDate) score += 15;
    if (submission.riskDetails) score += 20;
    if (submission.lossHistory) score += 15;
    if (submission.documents && submission.documents.length > 0) score += 10;

    submission.completenessScore = score;
    await this.submissionsRepository.save(submission);

    return score;
  }

  async uploadDocument(
    submissionId: string,
    file: Express.Multer.File,
    category: DocumentCategory,
    description: string,
    userId: string,
  ): Promise<SubmissionDocument> {
    const submission = await this.findOne(submissionId);

    const { key, url } = await this.storageService.uploadFile(file, submissionId, category);

    const document = this.documentsRepository.create({
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      fileUrl: url,
      s3Key: key,
      description,
      submissionId,
      uploadedById: userId,
    });

    return this.documentsRepository.save(document);
  }

  async getDocuments(submissionId: string): Promise<SubmissionDocument[]> {
    return this.documentsRepository.find({
      where: { submissionId },
      relations: ['uploadedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDocumentDownloadUrl(documentId: string): Promise<{ downloadUrl: string }> {
    const document = await this.documentsRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const downloadUrl = await this.storageService.getPresignedDownloadUrl(document.s3Key);
    return { downloadUrl };
  }

  async deleteDocument(documentId: string, userId: string): Promise<void> {
    const document = await this.documentsRepository.findOne({
      where: { id: documentId },
      relations: ['submission'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.submission.submittedById !== userId) {
      throw new ForbiddenException('You do not have permission to delete this document');
    }

    await this.storageService.deleteFile(document.s3Key);
    await this.documentsRepository.remove(document);
  }

  async remove(id: string, userId: string): Promise<void> {
    const submission = await this.findOne(id);

    if (submission.submittedById !== userId) {
      throw new ForbiddenException('You do not have permission to delete this submission');
    }

    await this.submissionsRepository.remove(submission);
  }
}
