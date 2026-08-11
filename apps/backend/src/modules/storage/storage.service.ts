import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

export enum DocumentCategory {
  RISK_SURVEY = 'risk_survey',
  LOSS_HISTORY = 'loss_history',
  FINANCIALS = 'financials',
  WORDINGS = 'wordings',
  CLAIMS_DOCUMENTATION = 'claims_documentation',
  OTHER = 'other',
}

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
    
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    submissionId: string,
    category: DocumentCategory = DocumentCategory.OTHER,
  ): Promise<{ key: string; url: string }> {
    const fileExtension = file.originalname.split('.').pop();
    const key = `submissions/${submissionId}/${category}/${randomUUID()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        submissionId,
        category,
      },
    });

    await this.s3Client.send(command);

    return {
      key,
      url: `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`,
    };
  }

  async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getPresignedUploadUrl(
    fileName: string,
    submissionId: string,
    category: DocumentCategory,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<{ uploadUrl: string; key: string }> {
    const fileExtension = fileName.split('.').pop();
    const key = `submissions/${submissionId}/${category}/${randomUUID()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    return { uploadUrl, key };
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  validateFileType(mimetype: string): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/csv',
    ];

    return allowedTypes.includes(mimetype);
  }

  validateFileSize(size: number, maxSizeMB: number = 50): boolean {
    return size <= maxSizeMB * 1024 * 1024;
  }
}