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
// import { ConversationService } from '../conversation/conversation.service';
//
//
// @WebSocketGateway({
//   cors: {
//     origin: '*',
//   },
//   namespace: '/chat',
// })
// export class ConversationGateway
//   implements OnGatewayConnection, OnGatewayDisconnect
// {
//   @WebSocketServer() server: Server;
//
//   // Track connected users
//   private connectedUsers = new Map<number, Socket>();
//   private userRooms = new Map<number, Set<string>>();
//
//   constructor(private readonly conversationService: ConversationService) {}
//
//   async handleConnection(client: Socket): Promise<void> {
//     console.log(`Client connected to conversation gateway: ${client.id}`);
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
//       console.error('Connection error in conversation gateway:', error);
//       client.disconnect();
//     }
//   }
//
//   handleDisconnect(client: Socket): void {
//     console.log(`Client disconnected from conversation gateway: ${client.id}`);
//
//     // Remove user from tracking map
//     for (const [userId, socket] of this.connectedUsers.entries()) {
//       if (socket.id === client.id) {
//         this.connectedUsers.delete(userId);
//         break;
//       }
//     }
//   }
// }
