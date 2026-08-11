import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicController } from './public.controller';
import { Organization } from '../organizations/entities/organization.entity';
import { Role } from '../users/entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, Role])],
  controllers: [PublicController],
})
export class PublicModule {}
