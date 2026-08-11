import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentCategory } from '../../storage/storage.service';

export class UploadDocumentDto {
  @ApiProperty({ example: 'submissionId-uuid' })
  @IsString()
  @IsNotEmpty()
  submissionId: string;

  @ApiProperty({ enum: DocumentCategory, example: DocumentCategory.RISK_SURVEY })
  @IsEnum(DocumentCategory)
  @IsNotEmpty()
  category: DocumentCategory;

  @ApiProperty({ example: 'Property risk survey document', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class GetPresignedUploadUrlDto {
  @ApiProperty({ example: 'document.pdf' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'submissionId-uuid' })
  @IsString()
  @IsNotEmpty()
  submissionId: string;

  @ApiProperty({ enum: DocumentCategory, example: DocumentCategory.RISK_SURVEY })
  @IsEnum(DocumentCategory)
  @IsNotEmpty()
  category: DocumentCategory;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @IsNotEmpty()
  contentType: string;
}