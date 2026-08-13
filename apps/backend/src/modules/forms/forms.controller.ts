import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { CreateFormSchemaDto } from './dto/create-form-schema.dto';
import { UpdateFormSchemaDto } from './dto/update-form-schema.dto';
import { CloneFormSchemaDto } from './dto/clone-form-schema.dto';
import { ValidateFormSchemaDto } from './dto/validate-form-schema.dto';
import { FormType } from './entities/form-schema.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '../users/entities/role.entity';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request';

@ApiTags('forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create form schema (Admin only). Created as an unpublished draft.' })
  create(@Body() createFormSchemaDto: CreateFormSchemaDto, @Request() req: AuthenticatedRequest) {
    return this.formsService.create(createFormSchemaDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all published form schemas' })
  findAll() {
    return this.formsService.findAll();
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get form schema by type' })
  findByType(@Param('type') type: FormType) {
    return this.formsService.findByType(type);
  }

  // ---- admin panel ------------------------------------------------------
  // Declared before the `:id` route below purely for readability; the paths
  // are two segments deep so they never collide with it.

  @Get('admin/schemas')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'List every schema version including drafts (Admin only)' })
  adminFindAll() {
    return this.formsService.adminFindAll();
  }

  @Post('admin/schemas')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new schema as a draft version (Admin only)' })
  adminCreate(@Body() dto: CreateFormSchemaDto, @Request() req: AuthenticatedRequest) {
    return this.formsService.create(dto, req.user);
  }

  @Post('admin/schemas/validate')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Dry-run a schema body against the renderer rules (Admin only)' })
  adminValidate(@Body() dto: ValidateFormSchemaDto) {
    return this.formsService.checkDefinition(dto.schema, dto.uiSchema);
  }

  @Get('admin/schemas/:id')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get one schema version, draft or published (Admin only)' })
  adminFindOne(@Param('id') id: string) {
    return this.formsService.findOne(id);
  }

  @Get('admin/schemas/:id/versions')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'List every version of this schema (Admin only)' })
  adminFindVersions(@Param('id') id: string) {
    return this.formsService.adminFindVersions(id);
  }

  @Patch('admin/schemas/:id')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Edit a schema version (Admin only). Drafts are edited in place; a published version is forked into a new draft.',
  })
  adminUpdate(
    @Param('id') id: string,
    @Body() dto: UpdateFormSchemaDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.formsService.update(id, dto, req.user);
  }

  @Post('admin/schemas/:id/clone')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Clone a schema version into a new draft (Admin only)' })
  adminClone(
    @Param('id') id: string,
    @Body() dto: CloneFormSchemaDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.formsService.clone(id, dto, req.user);
  }

  @Post('admin/schemas/:id/publish')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Publish a schema version to cedants (Admin only)' })
  adminPublish(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.formsService.publish(id, req.user);
  }

  @Post('admin/schemas/:id/unpublish')
  @Roles(RoleType.SUPER_ADMIN)
  @ApiOperation({ summary: 'Withdraw a published schema version (Admin only)' })
  adminUnpublish(@Param('id') id: string) {
    return this.formsService.unpublish(id);
  }

  // ---- consumer ---------------------------------------------------------

  @Get(':id')
  @ApiOperation({ summary: 'Get form schema by ID' })
  findOne(@Param('id') id: string) {
    return this.formsService.findOne(id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate form data against schema' })
  validate(@Body('formType') formType: FormType, @Body('data') data: any) {
    return this.formsService.validateFormData(formType, data);
  }
}
