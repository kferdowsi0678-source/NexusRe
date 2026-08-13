import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AppetiteService } from './appetite.service';
import { CreateRiskAppetiteDto } from './dto/create-risk-appetite.dto';
import { UpdateRiskAppetiteDto } from './dto/update-risk-appetite.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '../users/entities/role.entity';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request';

const REINSURER_ROLES = [RoleType.REINSURER_UNDERWRITER, RoleType.REINSURER_ADMIN] as const;

@ApiTags('risk-appetite')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AppetiteController {
  constructor(private readonly appetiteService: AppetiteService) {}

  @Post('risk-appetite')
  @Roles(...REINSURER_ROLES)
  @ApiOperation({ summary: 'Define a risk appetite (reinsurers only)' })
  create(@Body() dto: CreateRiskAppetiteDto, @Request() req: AuthenticatedRequest) {
    return this.appetiteService.create(dto, req.user);
  }

  @Get('risk-appetite')
  @Roles(...REINSURER_ROLES)
  @ApiOperation({ summary: 'List my organization\'s appetite definitions' })
  findMine(@Request() req: AuthenticatedRequest) {
    return this.appetiteService.findMine(req.user);
  }

  @Get('risk-appetite/opportunities')
  @Roles(...REINSURER_ROLES)
  @ApiOperation({ summary: 'Open submissions matching my appetite' })
  opportunities(@Request() req: AuthenticatedRequest) {
    return this.appetiteService.opportunitiesForReinsurer(req.user);
  }

  @Get('risk-appetite/:id')
  @Roles(...REINSURER_ROLES)
  @ApiOperation({ summary: 'Get one appetite definition' })
  findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.appetiteService.findOneOwned(id, req.user);
  }

  @Patch('risk-appetite/:id')
  @Roles(...REINSURER_ROLES)
  @ApiOperation({ summary: 'Update an appetite definition' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRiskAppetiteDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.appetiteService.update(id, dto, req.user);
  }

  @Delete('risk-appetite/:id')
  @Roles(...REINSURER_ROLES)
  @ApiOperation({ summary: 'Delete an appetite definition' })
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.appetiteService.remove(id, req.user);
  }

  @Get('submissions/:submissionId/matches')
  @ApiOperation({
    summary: 'Suggested markets for a submission',
    description:
      'Rule-based eligibility, re-ranked and explained by the model when one is configured. ' +
      'Pass ai=false to see the unassisted rule ranking.',
  })
  @ApiQuery({
    name: 'ai',
    required: false,
    description: 'Set to "false" to skip model re-ranking',
  })
  matches(@Param('submissionId') submissionId: string, @Query('ai') ai?: string) {
    return this.appetiteService.matchesForSubmission(submissionId, ai !== 'false');
  }
}
