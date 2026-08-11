import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OpenThreadDto {
  @ApiProperty({ description: 'The other organization in the conversation' })
  @IsUUID()
  @IsNotEmpty()
  counterpartyOrgId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  subject?: string;
}

export class PostMessageDto {
  @ApiProperty({ example: 'Can you confirm the loss history covers 2021?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;
}
