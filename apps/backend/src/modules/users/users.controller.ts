import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateEmailPreferencesDto } from './dto/update-email-preferences.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me/email-preferences')
  @ApiOperation({ summary: 'Email notification preferences for the signed-in user' })
  getEmailPreferences(@Request() req: AuthenticatedRequest) {
    return this.usersService.getEmailPreferences(req.user.userId);
  }

  @Patch('me/email-preferences')
  @ApiOperation({ summary: 'Update my email notification preferences' })
  updateEmailPreferences(
    @Body() dto: UpdateEmailPreferencesDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.usersService.updateEmailPreferences(req.user.userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@Request() req: AuthenticatedRequest) {
    return this.usersService.findOne(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}