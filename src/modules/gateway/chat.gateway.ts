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
import { Message } from '../message/entities/message.entity';
import { Member } from '../chat-member/entities/member.entity';
import { ChatRoom } from '../chat-room/entities/room.entity';

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

  async handleConnection(client: Socket, roomIds: number[]) {
    try {
      const userId = client.handshake.auth.userId;
      if (!userId) {
        client.disconnect();
        return;
      }

      this.connectedUsers.set(Number(userId), client);

      await this.handleJoinChats(roomIds, userId);
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
    for (const roomId of roomIds) socket.join(`room-${roomId}`);
  }

  async handleJoinChat(member: Member) {
    const socket = this.connectedUsers.get(member.user_id);
    if (!socket) return;

    socket.join(`room-${member.room_id}`);
  }

  async handleUpdateMember(member: Member) {
    const socket = this.connectedUsers.get(member.user_id);
    if (!socket) return;

    this.server.to(`room-${member.room_id}`).emit('update-member', member);
  }

  async handleLeaveChat(member: Member) {
    const socket = this.connectedUsers.get(member.user_id);
    if (!socket) return;

    await socket.leave(`room-${member.room_id}`);
    this.server.to(`room-${member.room_id}`).emit('leave-room', member);
  }

  async handleCreateChat(chatRoom: ChatRoom) {
    for (const member of chatRoom.members) {
      const socket = this.connectedUsers.get(member.user_id);
      if (!socket) continue;

      socket.join(`room-${chatRoom.room_id}`);
    }
    this.server.to(`room-${chatRoom.room_id}`).emit('new-room', {
      chatRoom,
    });
  }

  async handleUpdateChat(chatRoom: ChatRoom) {
    this.server.to(`room-${chatRoom.room_id}`).emit('update-room', chatRoom);
  }

  async handleDeleteChat(userIds: number[], roomId: number) {
    this.server.to(`room-${roomId}`).emit('delete-room', roomId);
    for (const userId of userIds) {
      const socket = this.connectedUsers.get(userId);
      if (!socket) continue;
      socket.leave(`room-${roomId}`);
    }
  }

  async handleSendMessage(message: Message) {
    this.server.to(`room-${message.room_id}`).emit('new-message', message);
  }

  async handleUpdateMessage(message: Message) {
    this.server.to(`room-${message.room_id}`).emit('message-updated', message);
  }

  async handleDeleteMessage(roomId: number, messageId: number) {
    this.server.to(`room-${roomId}`).emit('message-deleted', messageId);
  }

  // // @UseGuards(WsJwtGuard)
  // @SubscribeMessage('typing')
  // async handleTyping(
  //   @MessageBody() data: { roomId: number; isTyping: boolean },
  //   @ConnectedSocket() client: Socket,
  // ) {
  //   const userId = client.handshake.auth.userId;
  //
  //   if (!userId) {
  //     client.disconnect();
  //     return;
  //   }
  //
  //   this.server.to(`room-${data.roomId}`).emit('typing', {
  //     roomId: data.roomId,
  //     userId,
  //     isTyping: data.isTyping,
  //   });
  // }
  //
  // // @UseGuards(WsJwtGuard)
  // @SubscribeMessage('read')
  // async handleRead(
  //   @MessageBody() data: { roomId: number; messageId: number },
  //   @ConnectedSocket() client: Socket,
  // ) {
  //   const userId = client.handshake.auth.userId;
  //
  //   if (!userId) {
  //     client.disconnect();
  //     return;
  //   }
  //
  //   this.server.to(`room-${data.roomId}`).emit('read', {
  //     roomId: data.roomId,
  //     userId,
  //     messageId: data.messageId,
  //   });
  // }
}
