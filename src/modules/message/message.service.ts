import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MessageRepository } from './message.repository';
import { Message } from './entities/message.entity';
import { MemberService } from '../chat-member/member.service';
import { ChatGateway } from '../gateway/chat.gateway';
import { CreateMessageDto, UpdateMessageDto } from './dtos/message.dtos';
import { MessageResponseDto } from './dtos/message-response.dtos';
import { MinioClientService } from '../minio-client/minio-client.service';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly memberService: MemberService,
    private readonly chatGateway: ChatGateway,
    private readonly minioClientService: MinioClientService,
  ) {}

  // -> websockets
  async createMessage(
    createMessageDto: CreateMessageDto,
    userId: number,
    roomId: number,
  ) {
    if (!(await this.memberService.isActiveMember(roomId, userId)))
      throw new ForbiddenException('You are not an active member of this room');

    const member = await this.memberService.getMemberByRoomIdAndUserId(
      roomId,
      userId,
    );

    const message = Object.assign(new Message(), {
      room_id: roomId,
      member_id: member.member_id,
      body: createMessageDto.body,
      file: createMessageDto.file,
    });
    await this.messageRepository.saveMessage(message);

    // Convert to DTO before calling gateway
    const messageDto = MessageResponseDto.fromEntity(message);
    await this.chatGateway.handleSendMessage(messageDto);
  }

  // -> websockets
  async updateMessage(
    id: number,
    updateMessageDto: UpdateMessageDto,
    userId: number,
  ) {
    this.logger.log('123');
    const message = await this.canImpact(id, userId);

    if (updateMessageDto.body) message.body = updateMessageDto.body;
    else message.body = null;

    await this.messageRepository.saveMessage(message);

    // Convert to DTO before calling gateway
    const messageDto = MessageResponseDto.fromEntity(message);
    await this.chatGateway.handleUpdateMessage(messageDto);
  }

  // -> websocket
  async deleteMessage(id: number, userId: number) {
    const message = await this.canImpact(id, userId);
    if (message.file) await this.minioClientService.deleteFile(message.file);
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
    lastMessageCreateAt?: string,
    limit?: number,
  ) {
    if (!(await this.memberService.isActiveMember(roomId, userId)))
      throw new ForbiddenException('You are not an active member of this room');

    // convert lastMessageCreateAt to Date
    let lastMessageCreateAtDate: Date | undefined;
    if (lastMessageCreateAt) {
      lastMessageCreateAtDate = new Date(lastMessageCreateAt);
      if (isNaN(lastMessageCreateAtDate.getTime()))
        throw new NotFoundException('Invalid last message created at');
    }

    const messages = await this.messageRepository.getMessages(
      roomId,
      lastMessageCreateAtDate,
      limit,
    );

    return MessageResponseDto.fromEntitiesWithProcessedAvatars(
      messages,
      this.minioClientService,
    );
  }

  // private methods
  private async getMessageById(id: number) {
    return this.messageRepository.getMessageById(id);
  }

  private async canImpact(id: number, userId: number) {
    const message = await this.getMessageById(id);
    if (!message) throw new NotFoundException('Message not found');

    const messageAge = new Date().getTime() - message.created_at.getTime();
    this.logger.log(messageAge);
    this.logger.log(new Date());
    this.logger.log(message.created_at);
    if (messageAge > 5 * 60 * 1000 + 7 * 60 * 60 * 1000 /* 5 minutes */)
      throw new ForbiddenException(
        'You can only delete messages that are less than 5 minutes old',
      );

    const member = await this.memberService.getMemberByRoomIdAndUserId(
      message.room_id,
      userId,
    );

    if (!member || member.member_id !== message.member_id)
      throw new ForbiddenException(
        'You are not allowed to delete this message',
      );

    return message;
  }
}
