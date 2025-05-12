import { ChatRoom } from '../entities/room.entity';
import { MemberResponseDto } from '../../chat-member/dtos/member-response.dtos';
import { MinioClientService } from '../../minio-client/minio-client.service';

export class ChatRoomResponseDto {
  room_id: number;
  name: string;
  type: string;
  created_at: string;
  updated_at?: string;
  members: MemberResponseDto[];

  constructor(chatRoom: ChatRoom) {
    this.room_id = chatRoom.room_id;
    this.name = chatRoom.name;
    this.type = chatRoom.type;
    this.created_at = chatRoom.created_at.toISOString();
    this.updated_at = chatRoom.updated_at
      ? chatRoom.updated_at.toISOString()
      : undefined;

    if (chatRoom.members && chatRoom.members.length > 0) {
      this.members = MemberResponseDto.fromEntities(chatRoom.members);
    } else {
      this.members = [];
    }
  }

  static fromEntity(chatRoom: ChatRoom): ChatRoomResponseDto {
    return new ChatRoomResponseDto(chatRoom);
  }

  static async fromEntityWithProcessedAvatars(
    chatRoom: ChatRoom,
    minioClientService: MinioClientService,
  ): Promise<ChatRoomResponseDto> {
    const dto = new ChatRoomResponseDto(chatRoom);

    if (chatRoom.members && chatRoom.members.length > 0) {
      dto.members = await MemberResponseDto.fromEntitiesWithProcessedAvatars(
        chatRoom.members,
        minioClientService,
      );
    }

    return dto;
  }

  static fromEntities(chatRooms: ChatRoom[]): ChatRoomResponseDto[] {
    return chatRooms.map((chatRoom) =>
      ChatRoomResponseDto.fromEntity(chatRoom),
    );
  }

  static async fromEntitiesWithProcessedAvatars(
    chatRooms: ChatRoom[],
    minioClientService: MinioClientService,
  ): Promise<ChatRoomResponseDto[]> {
    return Promise.all(
      chatRooms.map((chatRoom) =>
        ChatRoomResponseDto.fromEntityWithProcessedAvatars(
          chatRoom,
          minioClientService,
        ),
      ),
    );
  }
}
