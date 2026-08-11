import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { CreateFormSchemaDto } from './dto/create-form-schema.dto';
import { FormType } from './entities/form-schema.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  @ApiOperation({ summary: 'Create form schema (Admin only)' })
  create(@Body() createFormSchemaDto: CreateFormSchemaDto) {
    return this.formsService.create(createFormSchemaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all form schemas' })
  findAll() {
    return this.formsService.findAll();
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get form schema by type' })
  findByType(@Param('type') type: FormType) {
    return this.formsService.findByType(type);
  }

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