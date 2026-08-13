import { IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Optional reporting window, applied to submission.createdAt.
 *
 * The global ValidationPipe runs with forbidNonWhitelisted, so anything not
 * declared here is rejected: every query field an analytics endpoint accepts
 * must appear on this DTO.
 */
export class AnalyticsRangeDto {
  @ApiProperty({ required: false, description: 'ISO date. Inclusive lower bound on createdAt.' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ required: false, description: 'ISO date. Inclusive upper bound on createdAt.' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
