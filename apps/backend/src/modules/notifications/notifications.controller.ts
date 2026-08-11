import { Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Notifications for the signed-in user' })
  @ApiQuery({ name: 'unreadOnly', required: false })
  findMine(@Request() req: AuthenticatedRequest, @Query('unreadOnly') unreadOnly?: string) {
    return this.notificationsService.findForUser(req.user.userId, unreadOnly === 'true');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread badge count' })
  unreadCount(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.unreadCount(req.user.userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification read' })
  markRead(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.notificationsService.markRead(id, req.user.userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark every notification read' })
  markAllRead(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.markAllRead(req.user.userId);
  }
}
