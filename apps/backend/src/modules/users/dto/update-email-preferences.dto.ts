import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Every flag is optional so the client can send only what changed. */
export class UpdateEmailPreferencesDto {
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  quoteReceived?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  quoteStatusChanged?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  messageReceived?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  submissionStatusChanged?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  weeklyDigest?: boolean;
}
