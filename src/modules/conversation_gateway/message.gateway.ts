// import {
//   WebSocketGateway,
//   SubscribeMessage,
//   MessageBody,
//   ConnectedSocket,
//   OnGatewayConnection,
//   OnGatewayDisconnect,
//   WebSocketServer,
// } from '@nestjs/websockets';
// import { Server, Socket } from 'socket.io';
// import { UseGuards } from '@nestjs/common';
// import { MessageService } from '../conversation_message/message.service';
// import { MemberService } from '../conversation_member/member.service';
// import { CreateMessageDto } from '../conversation_message/dtos/message.dtos';
// import { WsJwtGuard } from 'src/guards/websocket.jwt.guard';
//
// @WebSocketGateway({
//   cors: {
//     origin: '*',
//   },
//   namespace: '/chat',
// })
// export class MessageGateway
//   implements OnGatewayConnection, OnGatewayDisconnect
// {
//   @WebSocketServer() server: Server;
//
//   // Track connected users and their active rooms
//   private connectedUsers = new Map<number, Socket>();
//   private userRooms = new Map<number, Set<string>>();
//
//   constructor(
//     private readonly messageService: MessageService,
//     private readonly memberService: MemberService,
//   ) {}
//
//   async handleConnection(client: Socket) {
//     console.log(`Client connected to message gateway: ${client.id}`);
//
//     try {
//       // Verify token and get user from handshake auth
//       const userId = client.handshake.auth.userId;
//
//       if (!userId) {
//         client.disconnect();
//         return;
//       }
//
//       // Store the connected user
//       this.connectedUsers.set(Number(userId), client);
//       this.userRooms.set(Number(userId), new Set());
//     } catch (error) {
//       console.error('Connection error in message gateway:', error);
//       client.disconnect();
//     }
//   }
//
//   handleDisconnect(client: Socket) {
//     console.log(`Client disconnected from message gateway: ${client.id}`);
//
//     // Remove user from tracking maps
//     for (const [userId, socket] of this.connectedUsers.entries()) {
//       if (socket.id === client.id) {
//         this.connectedUsers.delete(userId);
//         this.userRooms.delete(userId);
//         break;
//       }
//     }
//   }
//
//   @UseGuards(WsJwtGuard)
//   @SubscribeMessage('joinConversation')
//   async handleJoinConversation(
//     @MessageBody() data: { conversationId: number },
//     @ConnectedSocket() client: Socket,
//   ) {
//     const userId = client.handshake.auth.userId;
//     const { conversationId } = data;
//
//     try {
//       // Check if user is a member of this conversation
//       const members = await this.memberService.getMembersByConversationId(
//         conversationId,
//         'active',
//       );
//
//       const isMember = members.some(
//         (member) => member.userUserId === Number(userId),
//       );
//
//       if (!isMember) {
//         return { error: 'Not authorized to join this conversation' };
//       }
//
//       // Join the socket room
//       const roomName = `conversation:${conversationId}`;
//       client.join(roomName);
//
//       // Track which rooms this user has joined
//       const userRooms = this.userRooms.get(Number(userId));
//       userRooms?.add(roomName);
//
//       return {
//         event: 'joinedConversation',
//         data: { conversationId, success: true },
//       };
//     } catch (error) {
//       console.error('Join conversation error:', error);
//       return { error: 'Failed to join conversation' };
//     }
//   }
//
//   @UseGuards(WsJwtGuard)
//   @SubscribeMessage('leaveConversation')
//   handleLeaveConversation(
//     @MessageBody() data: { conversationId: number },
//     @ConnectedSocket() client: Socket,
//   ) {
//     const userId = client.handshake.auth.userId;
//     const { conversationId } = data;
//     const roomName = `conversation:${conversationId}`;
//
//     client.leave(roomName);
//
//     // Remove room from user tracking
//     const userRooms = this.userRooms.get(Number(userId));
//     userRooms?.delete(roomName);
//
//     return {
//       event: 'leftConversation',
//       data: { conversationId, success: true },
//     };
//   }
//
//   @UseGuards(WsJwtGuard)
//   @SubscribeMessage('sendMessage')
//   async handleSendMessage(
//     @MessageBody() data: CreateMessageDto,
//     @ConnectedSocket() client: Socket,
//   ) {
//     const userId = client.handshake.auth.userId;
//
//     try {
//       // Save the message to the database
//       const savedMessage = await this.messageService.create(
//         data,
//         Number(userId),
//       );
//
//       // Broadcast the message to all clients in the conversation room
//       const roomName = `conversation:${data.conversationId}`;
//       this.server.to(roomName).emit('newMessage', savedMessage);
//
//       return {
//         event: 'messageSent',
//         data: { success: true, message: savedMessage },
//       };
//     } catch (error) {
//       console.error('Send message error:', error);
//       return { error: 'Failed to send message' };
//     }
//   }
//
//   @UseGuards(WsJwtGuard)
//   @SubscribeMessage('deleteMessage')
//   async handleDeleteMessage(
//     @MessageBody() data: { messageId: number, conversationId: number },
//     @ConnectedSocket() client: Socket,
//   ) {
//     const userId = client.handshake.auth.userId;
//     const { messageId, conversationId } = data;
//
//     try {
//       // Delete the message from the database
//       const result = await this.messageService.deleteMessage(messageId, userId);
//
//       if (!result) {
//         return { error: 'Failed to delete message' };
//       }
//
//       // Notify everyone in the conversation that the message was deleted
//       const roomName = `conversation:${conversationId}`;
//       this.server.to(roomName).emit('messageDeleted', {
//         messageId,
//         conversationId,
//         deletedBy: Number(userId),
//       });
//
//       return {
//         event: 'messageDeleted',
//         data: { success: true, messageId, conversationId },
//       };
//     } catch (error) {
//       console.error('Delete message error:', error);
//       return { error: 'Failed to delete message' };
//     }
//   }
//
//   @UseGuards(WsJwtGuard)
//   @SubscribeMessage('typing')
//   handleTyping(
//     @MessageBody() data: { conversationId: number; isTyping: boolean },
//     @ConnectedSocket() client: Socket,
//   ) {
//     const userId = client.handshake.auth.userId;
//     const { conversationId, isTyping } = data;
//
//     // Broadcast to everyone except sender that this user is typing
//     const roomName = `conversation:${conversationId}`;
//     client.to(roomName).emit('userTyping', {
//       userId: Number(userId),
//       conversationId,
//       isTyping,
//     });
//
//     return { success: true };
//   }
// }
