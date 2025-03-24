import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MessageRepository } from './message.repository';
import { Message } from './entities/message.entity';
import { MinioClientService } from '../minio-client/minio-client.service';
import { MemberService } from "../chat_member/member.service";

@Injectable()
export class MessageService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly memberService: MemberService,
    private readonly minioService: MinioClientService,
  ) {}

  // -> websockets
  async create(
    conversation_id: number,
    body: string,
    userId: number,
    files: { image?: any; video?: any; audio?: any; file?: any },
  ): Promise<Message> {
    // will be handled by the websocket gateway
    if (!(await this.memberService.isActiveMember(conversation_id, userId))) {
      throw new UnauthorizedException(
        'You are not an active member of this conversation',
      );
    }
    const message = Object.assign(new Message(), {
      conversationId: conversation_id,
      sender_id: userId,
      created_at: new Date(),
    });

    // save files to minio
    if (files.image)
      message.image = await this.minioService.upload(files.image, 'image');
    if (files.video)
      message.video = await this.minioService.upload(files.video, 'video');
    if (files.audio)
      message.audio = await this.minioService.upload(files.audio, 'audio');
    if (files.file)
      message.file = await this.minioService.upload(files.file, 'file');
    message.body = body;
    return await this.messageRepository.saveMessage(message);
  }

  // -> websockets
  async updateMessage(
    id: number,
    body: string,
    files: { image?: any; video?: any; audio?: any; file?: any },
    userId: number,
  ) {
    const message = await this.getMessageById(id);
    if (!message) throw new NotFoundException('Message not found');

    if (message.created_at.getTime() - new Date().getTime() > 1000 * 60 * 5) {
      throw new UnauthorizedException(
        'You can only edit messages that are less than 5 minutes old',
      );
    }

    const member = await this.memberService.getMemberByConversationIdAndUserId(
      message.conversation_id,
      userId,
    );

    if (
      !member ||
      member.type !== 'active' ||
      member.id !== message.sender_id
    ) {
      throw new UnauthorizedException(
        'You are not allowed to edit this message',
      );
    }

    if (body) message.body = body;
    else message.body = null;

    // delete old files
    if (message.image) await this.minioService.delete(message.image);
    if (message.video) await this.minioService.delete(message.video);
    if (message.file) await this.minioService.delete(message.file);
    if (message.audio) await this.minioService.delete(message.audio);

    // save new files
    if (files.image)
      message.image = await this.minioService.upload(files.image, 'image');
    else message.image = null;
    if (files.video)
      message.video = await this.minioService.upload(files.video, 'video');
    else message.video = null;
    if (files.audio)
      message.audio = await this.minioService.upload(files.audio, 'audio');
    else message.audio = null;
    if (files.file)
      message.file = await this.minioService.upload(files.file, 'file');
    else message.file = null;

    return await this.messageRepository.saveMessage(message);
  }

  // -> websocket
  async deleteMessage(id: number, userId: number) {
    const message = await this.getMessageById(id);
    if (!message) throw new NotFoundException('Message not found');

    if (message.created_at.getTime() - new Date().getTime() > 1000 * 60 * 5) {
      throw new UnauthorizedException(
        'You can only delete messages that are less than 5 minutes old',
      );
    }

    const member = await this.memberService.getMemberByConversationIdAndUserId(
      message.conversation_id,
      userId,
    );

    if (
      !member ||
      member.type !== 'active' ||
      member.id !== message.sender_id
    ) {
      throw new UnauthorizedException(
        'You are not allowed to delete this message',
      );
    }

    if (message.image) await this.minioService.delete(message.image);
    if (message.video) await this.minioService.delete(message.video);
    if (message.file) await this.minioService.delete(message.file);
    if (message.audio) await this.minioService.delete(message.audio);
    return await this.messageRepository.deleteMessage(id);
  }

  // -> restAPI // chưa test
  // too complex to cache, client's local storage is my in memory cache
  async getMessages(
    requestUserId: number,
    conversationId: number,
    lastMessageCreateAt?: Date,
    limit?: number,
  ) {
    if (
      !(await this.memberService.isActiveMember(conversationId, requestUserId))
    ) {
      throw new UnauthorizedException(
        'You are not an active member of this conversation',
      );
    }

    return await this.messageRepository.getMessages(
      conversationId,
      lastMessageCreateAt,
      limit,
    );
  }

  // private methods
  async getMessageById(id: number) {
    return this.messageRepository.getMessageById(id);
  }
}
