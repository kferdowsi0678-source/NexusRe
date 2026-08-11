import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission, SubmissionStatus } from './entities/submission.entity';
import { SubmissionDocument } from './entities/submission-document.entity';
import { SubmissionHistory } from './entities/submission-history.entity';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { StorageService, DocumentCategory } from '../storage/storage.service';

export enum ChangeType {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  DOCUMENT_ADDED = 'document_added',
  DOCUMENT_REMOVED = 'document_removed',
  SUBMITTED = 'submitted',
}

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
    @InjectRepository(SubmissionDocument)
    private documentsRepository: Repository<SubmissionDocument>,
    @InjectRepository(SubmissionHistory)
    private historyRepository: Repository<SubmissionHistory>,
    private storageService: StorageService,
  ) {}

  async create(createSubmissionDto: CreateSubmissionDto, userId: string): Promise<Submission> {
    const submission = this.submissionsRepository.create({
      ...createSubmissionDto,
      submittedById: userId,
      status: SubmissionStatus.DRAFT,
    });

    const saved = await this.submissionsRepository.save(submission);
    
    // Log creation
    await this.logHistory(saved.id, userId, ChangeType.CREATED, { submission: createSubmissionDto });

    return saved;
  }

  async findAll(filters: any): Promise<{ data: Submission[]; total: number; page: number; limit: number }> {
    const {
      search,
      status,
      type,
      lineOfBusiness,
      cedantId,
      createdAfter,
      createdBefore,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    const query = this.submissionsRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.cedant', 'cedant')
      .leftJoinAndSelect('submission.submittedBy', 'submittedBy')
      .leftJoinAndSelect('submission.documents', 'documents');

    if (search) {
      query.andWhere(
        '(submission.title ILIKE :search OR submission.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      query.andWhere('submission.status = :status', { status });
    }

    if (type) {
      query.andWhere('submission.type = :type', { type });
    }

    if (lineOfBusiness) {
      query.andWhere('submission.lineOfBusiness = :lineOfBusiness', { lineOfBusiness });
    }

    if (cedantId) {
      query.andWhere('submission.cedantId = :cedantId', { cedantId });
    }

    if (createdAfter) {
      query.andWhere('submission.createdAt >= :createdAfter', { createdAfter });
    }
    if (createdBefore) {
      query.andWhere('submission.createdAt <= :createdBefore', { createdBefore });
    }

    const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    query.orderBy(`submission.${sortField}`, sortOrder);

    const total = await query.getCount();
    query.skip((page - 1) * limit).take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
    };
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

    if (submission.submittedById !== userId) {
      throw new ForbiddenException('You do not have permission to update this submission');
    }

    const oldData = { ...submission };
    Object.assign(submission, updateSubmissionDto);
    const updated = await this.submissionsRepository.save(submission);

    // Log update
    await this.logHistory(id, userId, ChangeType.UPDATED, {
      old: oldData,
      new: updateSubmissionDto,
    });

    return updated;
  }

  async calculateCompletenessScore(id: string): Promise<number> {
    const submission = await this.findOne(id);
    let score = 0;

    if (submission.title && submission.title.length > 5) score += 10;
    if (submission.description && submission.description.length > 20) score += 10;
    if (submission.lineOfBusiness) score += 5;
    if (submission.type) score += 5;

    if (submission.sumInsured && submission.sumInsured > 0) score += 15;
    if (submission.currency) score += 5;
    if (submission.inceptionDate && submission.expiryDate) score += 5;

    if (submission.riskDetails && Object.keys(submission.riskDetails).length > 0) {
      const detailsCount = Object.keys(submission.riskDetails).length;
      score += Math.min(15, detailsCount * 3);
    }
    if (submission.lossHistory && Object.keys(submission.lossHistory).length > 0) score += 10;

    if (submission.documents && submission.documents.length > 0) {
      const docCount = submission.documents.length;
      score += Math.min(20, docCount * 5);
    }

    submission.completenessScore = Math.min(score, 100);
    await this.submissionsRepository.save(submission);
    return submission.completenessScore;
  }

  async submitSubmission(id: string, userId: string): Promise<Submission> {
    const submission = await this.findOne(id);

    if (submission.submittedById !== userId) {
      throw new ForbiddenException('You do not have permission to submit this submission');
    }

    if (submission.status !== SubmissionStatus.DRAFT) {
      throw new ForbiddenException('Only draft submissions can be submitted');
    }

    await this.calculateCompletenessScore(id);
    const updated = await this.findOne(id);

    if (updated.completenessScore < 50) {
      throw new ForbiddenException(`Submission completeness score is too low (${updated.completenessScore}%). Minimum 50% required.`);
    }

    updated.status = SubmissionStatus.SUBMITTED;
    updated.submittedAt = new Date();
    const result = await this.submissionsRepository.save(updated);

    // Log submission
    await this.logHistory(id, userId, ChangeType.SUBMITTED, {
      completenessScore: updated.completenessScore,
    });

    return result;
  }

  async updateStatus(id: string, status: SubmissionStatus, userId?: string): Promise<Submission> {
    const submission = await this.findOne(id);
    
    const allowedTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
      [SubmissionStatus.DRAFT]: [SubmissionStatus.SUBMITTED],
      [SubmissionStatus.SUBMITTED]: [SubmissionStatus.UNDER_REVIEW, SubmissionStatus.DECLINED],
      [SubmissionStatus.UNDER_REVIEW]: [SubmissionStatus.QUOTED, SubmissionStatus.DECLINED],
      [SubmissionStatus.QUOTED]: [SubmissionStatus.NEGOTIATING, SubmissionStatus.DECLINED, SubmissionStatus.EXPIRED],
      [SubmissionStatus.NEGOTIATING]: [SubmissionStatus.BOUND, SubmissionStatus.DECLINED, SubmissionStatus.EXPIRED],
      [SubmissionStatus.BOUND]: [],
      [SubmissionStatus.DECLINED]: [],
      [SubmissionStatus.EXPIRED]: [],
    };

    if (!allowedTransitions[submission.status].includes(status)) {
      throw new ForbiddenException(`Cannot transition from ${submission.status} to ${status}`);
    }

    const oldStatus = submission.status;
    submission.status = status;
    if (status === SubmissionStatus.SUBMITTED && !submission.submittedAt) {
      submission.submittedAt = new Date();
    }
    const result = await this.submissionsRepository.save(submission);

    // Log status change
    if (userId) {
      await this.logHistory(id, userId, ChangeType.STATUS_CHANGED, {
        oldStatus,
        newStatus: status,
      });
    }

    return result;
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

    const saved = await this.documentsRepository.save(document);

    // Log document addition
    await this.logHistory(submissionId, userId, ChangeType.DOCUMENT_ADDED, {
      documentId: saved.id,
      fileName: file.originalname,
    });

    return saved;
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

    // Log document removal
    await this.logHistory(document.submissionId, userId, ChangeType.DOCUMENT_REMOVED, {
      documentId,
      fileName: document.fileName,
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const submission = await this.findOne(id);

    if (submission.submittedById !== userId) {
      throw new ForbiddenException('You do not have permission to delete this submission');
    }

    await this.submissionsRepository.remove(submission);
  }

  // History tracking methods
  async logHistory(
    submissionId: string,
    userId: string,
    changeType: ChangeType,
    changes?: any,
    comment?: string,
  ): Promise<void> {
    const history = this.historyRepository.create({
      submissionId,
      userId,
      changeType,
      changes,
      comment,
    });

    await this.historyRepository.save(history);
  }

  async getHistory(submissionId: string): Promise<SubmissionHistory[]> {
    return this.historyRepository.find({
      where: { submissionId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getSubmissionTimeline(submissionId: string): Promise<any> {
    const history = await this.getHistory(submissionId);
    const submission = await this.findOne(submissionId);

    return {
      submission: {
        id: submission.id,
        title: submission.title,
        status: submission.status,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
      },
      timeline: history.map(h => ({
        id: h.id,
        type: h.changeType,
        user: {
          name: `${h.user.firstName} ${h.user.lastName}`,
          email: h.user.email,
        },
        changes: h.changes,
        comment: h.comment,
        timestamp: h.createdAt,
      })),
    };
  }
}