import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ChatRoomRepository } from './chatroom.repository';
import { FollowService } from '../follow/follow.service';
import { ChatRoom } from './entities/room.entity';
import { MemberService } from '../chat-member/member.service';
import { Member } from '../chat-member/entities/member.entity';
import { ChatGateway } from '../gateway/chat.gateway';
import { CreateRoomDto, UpdateRoomDto } from './dtos/room.dtos';
import { ChatRoomResponseDto } from './dtos/room-response.dtos';
import { MinioClientService } from '../minio-client/minio-client.service';

@Injectable()
export class ChatroomService {
  private readonly logger = new Logger(ChatroomService.name);
  constructor(
    private readonly chatRoomRepository: ChatRoomRepository,
    private readonly followService: FollowService,
    private readonly memberService: MemberService,
    private readonly chatGateway: ChatGateway,
    private readonly minioClientService: MinioClientService,
  ) {}

  async createChatRoom(createRoomDto: CreateRoomDto, user_id: number) {
    let chatRoom = Object.assign(new ChatRoom(), {
      name: createRoomDto.name,
      type: 'group',
      members: [],
    });

    // Save the chat room first to get the room_id
    chatRoom = await this.chatRoomRepository.save(chatRoom);

    const adminMember = Object.assign(new Member(), {
      user_id: user_id,
      room_id: chatRoom.room_id,
      role: 'admin',
    });
    chatRoom.members.push(adminMember);
    for (const memberId of createRoomDto.userIds) {
      if (memberId === user_id) continue;
      const member = Object.assign(new Member(), {
        user_id: memberId,
        room_id: chatRoom.room_id,
      });
      chatRoom.members.push(member);
    }

    chatRoom = await this.chatRoomRepository.save(chatRoom);
    chatRoom = await this.chatRoomRepository.findById(chatRoom.room_id);

    // Convert to DTO before calling gateway
    const chatRoomDto =
      await ChatRoomResponseDto.fromEntityWithProcessedAvatars(
        chatRoom,
        this.minioClientService,
      );
    const memberUserIds = chatRoom.members.map((member) => member.user_id);
    await this.chatGateway.handleCreateChat(chatRoomDto, memberUserIds);
  }

  async createDirectChatRoom(userId1: number, userId2: number) {
    if (await this.findDirectChatRoom(userId1, userId2)) {
      throw new ForbiddenException('Chat room already exists');
    }

    const isFollowing = await this.followService.isFollowing(userId2, userId1);
    const memberType = isFollowing ? 'active' : 'pending';
    const message = isFollowing
      ? 'Chat room is created'
      : 'You are not connected. The room is pending until the other user accepts your request';

    let chatRoom = Object.assign(new ChatRoom(), {
      members: [],
    });

    // Save the chat room first to get the room_id
    chatRoom = await this.chatRoomRepository.save(chatRoom);

    const member1 = Object.assign(new Member(), {
      user_id: userId1,
      room_id: chatRoom.room_id,
    });
    const member2 = Object.assign(new Member(), {
      user_id: userId2,
      room_id: chatRoom.room_id,
      type: memberType,
    });
    chatRoom.members.push(member1);
    chatRoom.members.push(member2);

    chatRoom = await this.chatRoomRepository.save(chatRoom);
    chatRoom = await this.chatRoomRepository.findById(chatRoom.room_id);

    // Convert to DTO before calling gateway
    const chatRoomDto =
      await ChatRoomResponseDto.fromEntityWithProcessedAvatars(
        chatRoom,
        this.minioClientService,
      );
    const memberUserIds = chatRoom.members.map((member) => member.user_id);
    await this.chatGateway.handleCreateChat(chatRoomDto, memberUserIds);

    return {
      statusCode: 201,
      message: message,
    };
  }

  // Rename method - update
  async updateRoom(id: number, updateRoomDto: UpdateRoomDto, userId: number) {
    if (!(await this.memberService.isActiveMember(id, userId)))
      throw new ForbiddenException('Only active members can update chat');

    // TODO: handle more features, but for now, just update name, therefore, not available for direct chat

    await this.chatRoomRepository.update(id, updateRoomDto);
    const chatRoom = await this.chatRoomRepository.findById(id);

    // Convert to DTO before calling gateway
    const chatRoomDto =
      await ChatRoomResponseDto.fromEntityWithProcessedAvatars(
        chatRoom,
        this.minioClientService,
      );
    await this.chatGateway.handleUpdateChat(chatRoomDto);
  }

  // Delete methods
  // For only admin
  async deleteRoom(id: number, userId: number) {
    if (!(await this.memberService.isAdmin(id, userId)))
      throw new ForbiddenException('Only admin can delete room');

    const chatRoom = await this.chatRoomRepository.findById(id);
    if (!chatRoom) throw new NotFoundException('Chat room not found');

    // Extract member user IDs before deleting the room
    const memberUserIds = chatRoom.members.map((member) => member.user_id);

    await this.chatRoomRepository.delete(id);
    await this.chatGateway.handleDeleteChat(chatRoom.room_id, memberUserIds);
  }

  // Get methods
  async getRoomsByUserId(userId: number, type: string) {
    const rooms = await this.chatRoomRepository.findByUserId(userId, type);
    return ChatRoomResponseDto.fromEntitiesWithProcessedAvatars(
      rooms,
      this.minioClientService,
    );
  }

  async getRoomById(id: number, userId: number) {
    if (!(await this.memberService.isActiveMember(id, userId)))
      throw new ForbiddenException('Only active members can get chat');
    const chatRoom = await this.chatRoomRepository.findById(id);
    if (!chatRoom) throw new NotFoundException('Chat room not found');
    return ChatRoomResponseDto.fromEntityWithProcessedAvatars(
      chatRoom,
      this.minioClientService,
    );
  }

  // Helper
  async findDirectChatRoom(userId1: number, userId2: number) {
    return await this.chatRoomRepository.findDirectChatRoom(userId1, userId2);
  }
}
