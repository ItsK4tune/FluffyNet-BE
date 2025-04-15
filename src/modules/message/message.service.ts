import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MessageRepository } from './message.repository';
import { Message } from './entities/message.entity';
import { MemberService } from '../chat-member/member.service';
import { ChatGateway } from '../gateway/chat.gateway';
import { CreateMessageDto, UpdateMessageDto } from './dtos/message.dtos';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly memberService: MemberService,
    private readonly chatGateway: ChatGateway,
  ) {}

  // -> websockets
  async createMessage(createMessageDto: CreateMessageDto, userId: number) {
    if (
      !(await this.memberService.isActiveMember(
        createMessageDto.roomId,
        userId,
      ))
    )
      throw new UnauthorizedException(
        'You are not an active member of this room',
      );

    const member = await this.memberService.getMemberByRoomIdAndUserId(
      createMessageDto.roomId,
      userId,
    );

    const message = Object.assign(new Message(), {
      room_id: createMessageDto.roomId,
      member_id: member.member_id,
      body: createMessageDto.body,
      file: createMessageDto.file,
    });
    await this.messageRepository.saveMessage(message);

    await this.chatGateway.handleSendMessage(message);
  }

  // -> websockets
  async updateMessage(
    id: number,
    updateMessageDto: UpdateMessageDto,
    userId: number,
  ) {
    const message = await this.canImpact(id, userId);

    if (updateMessageDto.body) message.body = updateMessageDto.body;
    else message.body = null;

    await this.messageRepository.saveMessage(message);
    await this.chatGateway.handleUpdateMessage(message);
  }

  // -> websocket
  async deleteMessage(id: number, userId: number) {
    const message = await this.canImpact(id, userId);
    // if (message.file) await this.minioService.deleteFile(message.file);
    await this.messageRepository.deleteMessage(id);

    await this.chatGateway.handleDeleteMessage(
      message.room_id,
      message.message_id,
    );
  }

  // -> restAPI // chưa test
  // too complex to cache, client's local storage is my in memory cache
  async getMessages(
    userId: number,
    roomId: number,
    lastMessageCreateAt?: Date,
    limit?: number,
  ) {
    if (!(await this.memberService.isActiveMember(roomId, userId)))
      throw new UnauthorizedException(
        'You are not an active member of this room',
      );

    const messages = await this.messageRepository.getMessages(
      roomId,
      lastMessageCreateAt,
      limit,
    );

    if (messages.length == 0)
      throw new NotFoundException('No more messages in this room');

    return messages;
  }

  // private methods
  private async getMessageById(id: number) {
    return this.messageRepository.getMessageById(id);
  }

  private async canImpact(id: number, userId: number) {
    const message = await this.getMessageById(id);
    if (!message) throw new NotFoundException('Message not found');

    if (message.created_at.getTime() - new Date().getTime() > 1000 * 60 * 5)
      throw new UnauthorizedException(
        'You can only delete messages that are less than 5 minutes old',
      );

    const member = await this.memberService.getMemberByRoomIdAndUserId(
      message.room_id,
      userId,
    );

    if (!member || member.member_id !== message.member_id)
      throw new UnauthorizedException(
        'You are not allowed to delete this message',
      );
    return message;
  }
}
