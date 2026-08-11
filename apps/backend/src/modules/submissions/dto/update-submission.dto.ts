import { PartialType } from '@nestjs/swagger';
import { CreateSubmissionDto } from './create-submission.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubmissionStatus } from '../entities/submission.entity';

export class UpdateSubmissionDto extends PartialType(CreateSubmissionDto) {
  @ApiProperty({ enum: SubmissionStatus, required: false })
  @IsEnum(SubmissionStatus)
  @IsOptional()
  status?: SubmissionStatus;
}
