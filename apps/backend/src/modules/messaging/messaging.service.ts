import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageThread } from './entities/message-thread.entity';
import { Message } from './entities/message.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { OpenThreadDto, PostMessageDto } from './dto/messaging.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(MessageThread)
    private threadsRepository: Repository<MessageThread>,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    private notifications: NotificationsService,
  ) {}

  private async loadSubmission(submissionId: string): Promise<Submission> {
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  /** True when the user speaks for the ceding side of this submission. */
  private isCedantSide(submission: Submission, user: AuthenticatedUser): boolean {
    return (
      submission.cedantId === user.organizationId ||
      submission.submittedById === user.userId
    );
  }

  private assertThreadAccess(thread: MessageThread, user: AuthenticatedUser): void {
    const isParticipant =
      thread.cedantOrgId === user.organizationId ||
      thread.counterpartyOrgId === user.organizationId;
    if (!isParticipant && !user.roles.includes('super_admin')) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }
  }

  /**
   * Opens the conversation between the ceding side and one counterparty, or
   * returns the existing one. Idempotent so either side can start it.
   */
  async openThread(
    submissionId: string,
    dto: OpenThreadDto,
    user: AuthenticatedUser,
  ): Promise<MessageThread> {
    const submission = await this.loadSubmission(submissionId);
    const cedantOrgId = submission.cedantId;

    // Whoever is not the cedant must be the counterparty, and they may only
    // open a thread on their own behalf.
    const counterpartyOrgId = this.isCedantSide(submission, user)
      ? dto.counterpartyOrgId
      : user.organizationId;

    if (counterpartyOrgId === cedantOrgId) {
      throw new ForbiddenException('A thread needs two different organizations');
    }

    const counterparty = await this.organizationsRepository.findOne({
      where: { id: counterpartyOrgId },
    });
    if (!counterparty) throw new NotFoundException('Counterparty organization not found');

    const existing = await this.threadsRepository.findOne({
      where: { submissionId, cedantOrgId, counterpartyOrgId },
    });
    if (existing) return existing;

    const thread = this.threadsRepository.create({
      submissionId,
      cedantOrgId,
      counterpartyOrgId,
      subject: dto.subject ?? submission.title,
    });
    return this.threadsRepository.save(thread);
  }

  /** Cedants see every thread on their submission; a counterparty sees only its own. */
  async listThreads(submissionId: string, user: AuthenticatedUser): Promise<MessageThread[]> {
    const submission = await this.loadSubmission(submissionId);
    const cedantSide = this.isCedantSide(submission, user);

    const where = cedantSide
      ? { submissionId }
      : { submissionId, counterpartyOrgId: user.organizationId };

    return this.threadsRepository.find({
      where,
      relations: ['cedantOrg', 'counterpartyOrg'],
      order: { lastMessageAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async getThread(threadId: string, user: AuthenticatedUser) {
    const thread = await this.threadsRepository.findOne({
      where: { id: threadId },
      relations: ['cedantOrg', 'counterpartyOrg', 'submission'],
    });
    if (!thread) throw new NotFoundException('Conversation not found');
    this.assertThreadAccess(thread, user);

    const messages = await this.messagesRepository.find({
      where: { threadId },
      relations: ['sender', 'senderOrg'],
      order: { createdAt: 'ASC' },
    });

    return {
      id: thread.id,
      submissionId: thread.submissionId,
      subject: thread.subject,
      cedantOrg: { id: thread.cedantOrgId, name: thread.cedantOrg?.name },
      counterpartyOrg: { id: thread.counterpartyOrgId, name: thread.counterpartyOrg?.name },
      messages: messages.map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: message.createdAt,
        senderName: message.sender
          ? `${message.sender.firstName} ${message.sender.lastName}`
          : 'Unknown',
        senderOrgId: message.senderOrgId,
        senderOrgName: message.senderOrg?.name,
        mine: message.senderId === user.userId,
      })),
    };
  }

  async postMessage(
    threadId: string,
    dto: PostMessageDto,
    user: AuthenticatedUser,
  ): Promise<Message> {
    const thread = await this.threadsRepository.findOne({
      where: { id: threadId },
      relations: ['submission'],
    });
    if (!thread) throw new NotFoundException('Conversation not found');
    this.assertThreadAccess(thread, user);

    const message = this.messagesRepository.create({
      threadId,
      senderId: user.userId,
      senderOrgId: user.organizationId,
      body: dto.body,
    });
    const saved = await this.messagesRepository.save(message);

    thread.lastMessageAt = saved.createdAt ?? new Date();
    await this.threadsRepository.save(thread);

    // Notify the organization on the other side of this thread.
    const audience =
      thread.cedantOrgId === user.organizationId
        ? thread.counterpartyOrgId
        : thread.cedantOrgId;

    await this.notifications.notifyOrganization(
      audience,
      NotificationType.MESSAGE_RECEIVED,
      'New message',
      thread.submission?.title ?? thread.subject,
      { submissionId: thread.submissionId, threadId },
      user.userId,
    );

    return saved;
  }
}
