import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { OpenThreadDto, PostMessageDto } from './dto/messaging.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request';

@ApiTags('messaging')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('submissions/:submissionId/threads')
  @ApiOperation({ summary: 'Open or reuse a conversation on a submission' })
  openThread(
    @Param('submissionId') submissionId: string,
    @Body() dto: OpenThreadDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.messagingService.openThread(submissionId, dto, req.user);
  }

  @Get('submissions/:submissionId/threads')
  @ApiOperation({ summary: 'Conversations visible to me on a submission' })
  listThreads(
    @Param('submissionId') submissionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.messagingService.listThreads(submissionId, req.user);
  }

  @Get('threads/:threadId')
  @ApiOperation({ summary: 'Read a conversation' })
  getThread(@Param('threadId') threadId: string, @Request() req: AuthenticatedRequest) {
    return this.messagingService.getThread(threadId, req.user);
  }

  @Post('threads/:threadId/messages')
  @ApiOperation({ summary: 'Post a message' })
  postMessage(
    @Param('threadId') threadId: string,
    @Body() dto: PostMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.messagingService.postMessage(threadId, dto, req.user);
  }
}
