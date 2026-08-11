import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuoteType } from '../../submissions/entities/quote.entity';

export class CreateQuoteDto {
  @ApiProperty({ enum: QuoteType, example: QuoteType.INDICATION })
  @IsEnum(QuoteType)
  @IsNotEmpty()
  quoteType: QuoteType;

  @ApiProperty({ example: 0.125, description: 'Rate applied, as a decimal' })
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiProperty({ example: 125000 })
  @IsNumber()
  @Min(0)
  premium: number;

  @ApiProperty({ example: 25, description: 'Share of the risk offered, percent' })
  @IsNumber()
  @Min(0)
  capacity: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  conditions?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  exclusions?: string;

  @ApiProperty({ required: false, example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;
}
