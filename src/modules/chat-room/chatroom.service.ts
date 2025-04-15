import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ChatRoomRepository } from './chatroom.repository';
import { FollowService } from '../follow/follow.service';
import { ChatRoom } from './entities/room.entity';
import { MemberService } from '../chat-member/member.service';
import { Member } from '../chat-member/entities/member.entity';
import { ChatGateway } from '../gateway/chat.gateway';
import { CreateRoomDto, UpdateRoomDto } from './dtos/room.dtos';

@Injectable()
export class ChatroomService {
  private readonly logger = new Logger(ChatroomService.name);
  constructor(
    private readonly chatRoomRepository: ChatRoomRepository,
    private readonly followService: FollowService,
    private readonly memberService: MemberService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async createChatRoom(createRoomDto: CreateRoomDto, user_id: number) {
    let chatRoom = Object.assign(new ChatRoom(), {
      name: createRoomDto.name,
      type: 'group',
      members: [],
    });

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
    await this.chatGateway.handleCreateChat(chatRoom);
  }

  async createDirectChatRoom(userId1: number, userId2: number) {
    if (await this.chatRoomRepository.findDirectChatRoom(userId1, userId2)) {
      throw new ForbiddenException('Chat room already exists');
    }

    // TODO: auto create chat room if both users are following each other
    // TODO: auto accept request if user2 follow user1 when they has pending chat room ? Can frontend do this

    const isFollowing = await this.followService.isFollowing(userId2, userId1);
    const memberType = isFollowing ? 'active' : 'pending';
    const message = isFollowing
      ? 'Chat room is created'
      : 'You and {user2} are not connected. The room is pending until {user2} accepts your request';

    let chatRoom = Object.assign(new ChatRoom(), {
      members: [],
    });

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

    await this.chatGateway.handleCreateChat(chatRoom);
    return {
      statusCode: 201,
      message: message.replace('{user2}', userId2.toString()),
    };
  }

  // Rename method - update
  async updateRoom(id: number, updateRoomDto: UpdateRoomDto, userId: number) {
    if (!(await this.memberService.isActiveMember(id, userId)))
      throw new UnauthorizedException('Only active members can update chat');

    // TODO: handle more features, but for now, just update name, therefore, not available for direct chat

    await this.chatRoomRepository.update(id, updateRoomDto);
    const chatRoom = await this.chatRoomRepository.findById(id);

    await this.chatGateway.handleUpdateChat(chatRoom);
  }

  // Delete methods
  // For only admin
  async deleteRoom(id: number, userId: number) {
    if (!(await this.memberService.isAdmin(id, userId)))
      throw new UnauthorizedException('Only admin can delete room');

    await this.chatRoomRepository.delete(id);
    // await this.chatGateway.handleDeleteChat();
  }

  // Get methods
  async getRoomsByUserId(userId: number, type: string) {
    return await this.chatRoomRepository.findByUserId(userId, type);
  }
}
