import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Organization } from '../organizations/entities/organization.entity';
import { Role } from '../users/entities/role.entity';

// Unauthenticated lookup data required to complete self-registration.
// Only non-sensitive fields are exposed.
@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  @Get('organizations')
  @ApiOperation({ summary: 'List organizations available for registration' })
  async organizations() {
    const organizations = await this.organizationsRepository.find({
      where: { isActive: true },
      select: ['id', 'name', 'type', 'country'],
      order: { name: 'ASC' },
    });
    return organizations;
  }

  @Get('roles')
  @ApiOperation({ summary: 'List roles assignable at registration' })
  async roles() {
    const roles = await this.rolesRepository.find({
      select: ['id', 'name', 'description'],
    });
    // Platform-wide administrator roles are never self-assignable.
    return roles.filter((role) => role.name !== 'super_admin');
  }
}
