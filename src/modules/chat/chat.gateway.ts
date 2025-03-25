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
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from 'src/guards/websocket.guard';
import { MessageService } from '../message/message.service';
import { MemberService } from '../chat_member/member.service';
import { ConversationService } from './conversation.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ConversationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  // Track connected users
  private connectedUsers = new Map<number, Socket>();
  private userRooms = new Map<number, Set<string>>();

  constructor(
    private readonly memberService: MemberService,
    private readonly messageService: MessageService,
    private readonly conversationService: ConversationService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    console.log(`Client connected to conversation gateway: ${client.id}`);

    try {
      // Verify token and get user from handshake auth
      const userId = client.handshake.auth.userId;

      if (!userId) {
        client.disconnect();
        return;
      }

      // Store the connected user
      this.connectedUsers.set(Number(userId), client);
      this.userRooms.set(Number(userId), new Set());
    } catch (error) {
      console.error('Connection error in conversation gateway:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    console.log(`Client disconnected from conversation gateway: ${client.id}`);

    // Remove user from tracking map
    for (const [userId, socket] of this.connectedUsers.entries()) {
      if (socket.id === client.id) {
        this.connectedUsers.delete(userId);
        break;
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() data: { conversationIds: number[] },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const userId = client.handshake.auth.userId;

    if (!userId) {
      client.disconnect();
      return;
    }

    for (const conversationId of data.conversationIds) {
      // Check if user is a member of the conversation
      if (!(await this.memberService.isActiveMember(conversationId, userId))) {
        continue;
      }

      // Join the conversation room
      client.join(`conversation-${conversationId}`);
      this.userRooms.get(Number(userId)).add(`conversation-${conversationId}`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @MessageBody() data: { conversationId: number },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const userId = client.handshake.auth.userId;

    if (!userId) {
      client.disconnect();
      return;
    }

    await this.memberService.leaveConversation(data.conversationId, userId);

    // Leave the conversation room
    client.leave(`conversation-${data.conversationId}`);
    this.userRooms
      .get(Number(userId))
      .delete(`conversation-${data.conversationId}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send-message')
  async handleMessage(
    @MessageBody()
    data: {
      conversation_id: number;
      body: string;
      files: { image?: any; video?: any; audio?: any; file?: any };
    },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const userId = client.handshake.auth.userId;

    if (!userId) {
      client.disconnect();
      return;
    }

    // Check if user is a member of the conversation
    if (
      !(await this.memberService.isActiveMember(data.conversation_id, userId))
    ) {
      client.disconnect();
      return;
    }

    // Save message to database
    const message = await this.messageService.create(
      data.conversation_id,
      data.body,
      userId,
      data.files,
    );

    // Send message to conversation room
    this.server.to(`conversation-${data.conversation_id}`).emit('new-message', {
      conversationId: data.conversation_id,
      body: message,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { conversationId: number; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const userId = client.handshake.auth.userId;

    if (!userId) {
      client.disconnect();
      return;
    }

    if (
      !(await this.memberService.isActiveMember(data.conversationId, userId))
    ) {
      client.leave(`conversation-${data.conversationId}`);
      this.userRooms
        .get(Number(userId))
        .delete(`conversation-${data.conversationId}`);
      return;
    }

    // Send typing event to conversation room
    this.server.to(`conversation-${data.conversationId}`).emit('typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: data.isTyping,
    });
  }
}
