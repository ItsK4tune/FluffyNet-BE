import { Message } from '../entities/message.entity';
import { MemberResponseDto } from '../../chat-member/dtos/member-response.dtos';
import { MinioClientService } from '../../minio-client/minio-client.service';

export class MessageResponseDto {
  message_id: number;
  room_id: number;
  member_id: number;
  body?: string;
  file?: string;
  created_at: string;
  updated_at?: string;
  // Removed member property as per requirement: "message only content, not include member"

  constructor(message: Message) {
    this.message_id = message.message_id;
    this.room_id = message.room_id;
    this.member_id = message.member_id;
    this.body = message.body;
    this.file = message.file;
    this.created_at = message.created_at.toISOString();
    this.updated_at = message.updated_at
      ? message.updated_at.toISOString()
      : undefined;
    // Removed member assignment
  }

  static fromEntity(message: Message): MessageResponseDto {
    return new MessageResponseDto(message);
  }

  static fromEntities(messages: Message[]): MessageResponseDto[] {
    return messages.map((message) => MessageResponseDto.fromEntity(message));
  }

  static async fromEntityWithProcessedAvatar(
    message: Message,
    minioClientService: MinioClientService,
  ): Promise<MessageResponseDto> {
    return new MessageResponseDto(message);
  }

  static async fromEntitiesWithProcessedAvatars(
    messages: Message[],
    minioClientService: MinioClientService,
  ): Promise<MessageResponseDto[]> {
    return Promise.all(
      messages.map((message) =>
        MessageResponseDto.fromEntityWithProcessedAvatar(
          message,
          minioClientService,
        ),
      ),
    );
  }
}
