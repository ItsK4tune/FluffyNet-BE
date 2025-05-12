import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from 'src/guards/websocket.guard';
import { MessageResponseDto } from '../message/dtos/message-response.dtos';
import { MemberResponseDto } from '../chat-member/dtos/member-response.dtos';
import { ChatRoomResponseDto } from '../chat-room/dtos/room-response.dtos';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger: Logger = new Logger(ChatGateway.name);

  private connectedUsers = new Map<number, Socket>();

  constructor() {}

  async handleConnection(client: Socket) {
    try {
      const userId = client.handshake.auth.userId;

      if (!userId) {
        client.disconnect();
        return;
      }
      const roomIds = client.handshake.auth.roomIds;

      this.connectedUsers.set(Number(userId), client);

      if (roomIds.length > 0) {
        await this.handleJoinChats(roomIds, userId);
      }
    } catch (error) {
      this.logger.error('Error on connection', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    for (const [userId, socket] of this.connectedUsers.entries()) {
      if (socket.id === client.id) {
        this.connectedUsers.delete(userId);
        break;
      }
    }
  }

  async handleJoinChats(roomIds: number[], userId: number) {
    const socket = this.connectedUsers.get(userId);
    for (const roomId of roomIds) {
      socket.join(`room-${roomId}`);
    }
  }

  async handleJoinChat(memberDto: MemberResponseDto) {
    this.server.to(`room-${memberDto.room_id}`).emit('join-room', memberDto);

    const socket = this.connectedUsers.get(memberDto.user_id);
    if (!socket) return;
    socket.join(`room-${memberDto.room_id}`);
  }

  async handleUpdateMember(memberDto: MemberResponseDto) {
    this.server
      .to(`room-${memberDto.room_id}`)
      .emit('update-member', memberDto);
  }

  async handleLeaveChat(memberDto: MemberResponseDto) {
    this.server.to(`room-${memberDto.room_id}`).emit('leave-room', memberDto);
    const socket = this.connectedUsers.get(memberDto.user_id);

    if (!socket) return;
    await socket.leave(`room-${memberDto.room_id}`);
  }

  async handleCreateChat(
    chatRoomDto: ChatRoomResponseDto,
    memberUserIds: number[],
  ) {
    for (const userId of memberUserIds) {
      const socket = this.connectedUsers.get(userId);
      if (!socket) continue;

      socket.join(`room-${chatRoomDto.room_id}`);
    }
    this.server.to(`room-${chatRoomDto.room_id}`).emit('new-room', {
      chatRoom: chatRoomDto,
    });
  }

  async handleUpdateChat(chatRoomDto: ChatRoomResponseDto) {
    this.server
      .to(`room-${chatRoomDto.room_id}`)
      .emit('update-room', chatRoomDto);
  }

  async handleDeleteChat(roomId: number, memberUserIds: number[]) {
    this.server.to(`room-${roomId}`).emit('delete-room', roomId);
    for (const userId of memberUserIds) {
      const socket = this.connectedUsers.get(userId);
      if (!socket) continue;
      socket.leave(`room-${roomId}`);
    }
  }

  async handleSendMessage(messageDto: MessageResponseDto) {
    this.server
      .to(`room-${messageDto.room_id}`)
      .emit('new-message', messageDto);
  }

  async handleUpdateMessage(messageDto: MessageResponseDto) {
    this.server
      .to(`room-${messageDto.room_id}`)
      .emit('update-message', messageDto);
  }

  async handleDeleteMessage(roomId: number, messageId: number) {
    this.server
      .to(`room-${roomId}`)
      .emit('delete-message', { messageId, roomId });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { roomId: number; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log('handleTyping', JSON.stringify(data));
    const userId = client.handshake.auth.userId;

    if (!userId) {
      client.disconnect();
      return;
    }

    this.server.to(`room-${data.roomId}`).emit('typing', {
      roomId: data.roomId,
      userId,
      isTyping: data.isTyping,
    });
  }
}
