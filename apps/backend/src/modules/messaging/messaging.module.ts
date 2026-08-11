import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { MessageThread } from './entities/message-thread.entity';
import { Message } from './entities/message.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageThread, Message, Submission, Organization]),
    NotificationsModule,
  ],
  providers: [MessagingService],
  controllers: [MessagingController],
  exports: [MessagingService],
})
export class MessagingModule {}
