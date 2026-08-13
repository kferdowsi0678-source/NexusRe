import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { FieldReviewStatus } from '../extraction-normalisation';

/** The decisions a reviewer is allowed to record. `suggested` is not one of them. */
export enum FieldDecision {
  ACCEPT = 'accept',
  EDIT = 'edit',
  REJECT = 'reject',
}

export const DECISION_TO_STATUS: Record<FieldDecision, FieldReviewStatus> = {
  [FieldDecision.ACCEPT]: FieldReviewStatus.ACCEPTED,
  [FieldDecision.EDIT]: FieldReviewStatus.EDITED,
  [FieldDecision.REJECT]: FieldReviewStatus.REJECTED,
};

export class FieldDecisionDto {
  @ApiProperty({ description: 'Dot path of the extracted field being reviewed' })
  @IsString()
  @MaxLength(120)
  key: string;

  @ApiProperty({ enum: FieldDecision })
  @IsEnum(FieldDecision)
  decision: FieldDecision;

  @ApiPropertyOptional({
    description: 'Replacement value. Required when the decision is "edit".',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  correctedValue?: string;
}

export class ReviewExtractionDto {
  @ApiProperty({ type: [FieldDecisionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => FieldDecisionDto)
  decisions: FieldDecisionDto[];
}

export class CreateExtractionDto {
  @ApiProperty({ description: 'Document to read. Must belong to the submission in the path.' })
  @IsString()
  documentId: string;
}
