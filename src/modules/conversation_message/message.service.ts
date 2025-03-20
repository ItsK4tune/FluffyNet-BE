import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dtos/message.dtos';
import { MessageRepository } from './message.repository';
import { MemberService } from '../conversation_member/member.service';

@Injectable()
export class MessageService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly memberService: MemberService,
  ) {}

  // -> websockets
  async create(
    createMessageDto: CreateMessageDto,
    userId: number,
  ): Promise<Message> {
    if (
      !(await this.memberService.isActiveMember(
        createMessageDto.conversationId,
        userId,
      ))
    ) {
      throw new UnauthorizedException(
        'You are not an active member of this conversation',
      );
    }

    const message = Object.assign(new Message(), {
      ...createMessageDto,
      senderId: userId,
      createdAt: new Date(),
    });

    return await this.messageRepository.saveMessage(message);
  }

  // -> websocket
  async deleteMessage(id: number, userId: number) {
    const message = await this.messageRepository.getMessageById(id);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const member = await this.memberService.getMemberByConversationIdAndUserId(
      message.conversationId,
      userId,
    );

    if (!member || member.type !== 'active' || member.id !== message.senderId) {
      throw new UnauthorizedException(
        'You are not allowed to delete this message',
      );
    }
    return await this.messageRepository.deleteMessage(id);
  }

  // -> restAPI // chưa test
  async getMessages(
    requestUserId: number,
    conversationId: number,
    lastMessageCreatedAt?: Date,
    limit?: number,
  ) {
    // is the user an active member of the conversation?

    if (
      !(await this.memberService.isActiveMember(conversationId, requestUserId))
    ) {
      throw new UnauthorizedException(
        'You are not an active member of this conversation',
      );
    }

    return this.messageRepository.getMessages(
      conversationId,
      lastMessageCreatedAt,
      limit,
    );
  }
}
