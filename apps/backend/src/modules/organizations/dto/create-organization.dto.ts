import { IsNotEmpty, IsString, IsEnum, IsOptional, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrganizationType } from '../entities/organization.entity';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Insurance Company' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: OrganizationType, example: OrganizationType.CEDANT })
  @IsEnum(OrganizationType)
  @IsNotEmpty()
  type: OrganizationType;

  @ApiProperty({ example: 'Nigeria', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: '123 Main St, Lagos', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: '+234-123-4567', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'info@acmeinsurance.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'https://www.acmeinsurance.com', required: false })
  @IsUrl()
  @IsOptional()
  website?: string;
}
