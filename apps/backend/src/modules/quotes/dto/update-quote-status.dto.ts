import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuoteStatus } from '../../submissions/entities/quote.entity';

export class UpdateQuoteStatusDto {
  @ApiProperty({ enum: QuoteStatus })
  @IsEnum(QuoteStatus)
  @IsNotEmpty()
  status: QuoteStatus;

  @ApiProperty({ required: false, description: 'Required when declining' })
  @IsString()
  @IsOptional()
  declineReason?: string;
}
