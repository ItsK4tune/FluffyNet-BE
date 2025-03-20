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
// import { WsJwtGuard } from 'src/guards/websocket.jwt.guard';
//
// @WebSocketGateway({
//   cors: {
//     origin: '*',
//   },
//   namespace: '/chat',
// })
// export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
//   @WebSocketServer() server: Server;
//
//   // Track active calls and participants
//   private activeCalls = new Map<number, Set<number>>();
//   private userCalls = new Map<number, number>();
//
//   async handleConnection(client: Socket) {
//     console.log(`Client connected to call gateway: ${client.id}`);
//
//     try {
//       const userId = client.handshake.auth.userId;
//
//       if (!userId) {
//         client.disconnect();
//         return;
//       }
//     } catch (error) {
//       console.error('Connection error in call gateway:', error);
//       client.disconnect();
//     }
//   }
//
//   handleDisconnect(client: Socket) {
//     console.log(`Client disconnected from call gateway: ${client.id}`);
//
//     const userId = client.handshake.auth.userId;
//     if (userId) {
//       // Leave any active call when disconnecting
//       this.handleUserLeaveCall(Number(userId));
//     }
//   }
//
//   private handleUserLeaveCall(userId: number) {
//     const conversationId = this.userCalls.get(userId);
//     if (conversationId) {
//       const callParticipants = this.activeCalls.get(conversationId);
//
//       if (callParticipants) {
//         // Remove user from call participants
//         callParticipants.delete(userId);
//
//         // Notify others that user left the call
//         const roomName = `call:${conversationId}`;
//         this.server
//           .to(roomName)
//           .emit('userLeftCall', { userId, conversationId });
//
//         // If no participants left, end the call
//         if (callParticipants.size === 0) {
//           this.activeCalls.delete(conversationId);
//         }
//       }
//
//       this.userCalls.delete(userId);
//     }
//   }
//
//   @UseGuards(WsJwtGuard)
//   @SubscribeMessage('startCall')
//   async handleStartCall(
//     @MessageBody() data: { conversationId: number },
//     @ConnectedSocket() client: Socket,
//   ) {
//     const userId = client.handshake.auth.userId;
//     const { conversationId } = data;
//
//     try {
//       // Create call room if it doesn't exist
//       if (!this.activeCalls.has(conversationId)) {
//         this.activeCalls.set(conversationId, new Set<number>());
//       }
//
//       // Add user to call participants
//       const callParticipants = this.activeCalls.get(conversationId);
//       callParticipants.add(Number(userId));
//
//       // Track which call this user is in
//       this.userCalls.set(Number(userId), conversationId);
//
//       // Join socket room for the call
//       const roomName = `call:${conversationId}`;
//       client.join(roomName);
//
//       // Notify everyone in the conversation about the call
//       const conversationRoom = `conversation:${conversationId}`;
//       this.server.to(conversationRoom).emit('callStarted', {
//         conversationId,
//         initiator: Number(userId),
//         participants: Array.from(callParticipants),
//       });
//
//       return {
//         event: 'callStarted',
//         data: {
//           success: true,
//           conversationId,
//           participants: Array.from(callParticipants),
//         },
//       };
//     } catch (error) {
//       console.error('Start call error:', error);
//       return { error: 'Failed to start call' };
//     }
//   }
//
//   @UseGuards(WsJwtGuard)
//   @SubscribeMessage('joinCall')
//   async handleJoinCall(
//     @MessageBody() data: { conversationId: number },
//     @ConnectedSocket() client: Socket,
//   ) {
//     const userId = client.handshake.auth.userId;
//     const { conversationId } = data;
//
//     try {
//       // Check if call exists
//       if (!this.activeCalls.has(conversationId)) {
//         return { error: 'Call does not exist' };
//       }
//
//       // Add user to call participants
//       const callParticipants = this.activeCalls.get(conversationId);
//       callParticipants.add(Number(userId));
//
//       // Track which call this user is in
//       this.userCalls.set(Number(userId), conversationId);
//
//       // Join socket room for the call
//       const roomName = `call:${conversationId}`;
//       client.join(roomName);
//
//       // Notify others in the call that user joined
//       client.to(roomName).emit('userJoinedCall', {
//         userId: Number(userId),
//         conversationId,
//       });
//
//       return {
//         event: 'joinedCall',
//         data: {
//           success: true,
//           conversationId,
//           participants: Array.from(callParticipants),
//         },
//       };
//     } catch (error) {
//       console.error('Join call error:', error);
//       return { error: 'Failed to join call' };
//     }
//   }
//
//   @UseGuards(WsJwtGuard)
//   @SubscribeMessage('leaveCall')
//   handleLeaveCall(
//     @MessageBody() data: { conversationId: number },
//     @ConnectedSocket() client: Socket,
//   ) {
//     const userId = client.handshake.auth.userId;
//     const { conversationId } = data;
//
//     try {
//       // Remove user from participants
//       const callParticipants = this.activeCalls.get(conversationId);
//       if (callParticipants) {
//         callParticipants.delete(Number(userId));
//
//         // If no participants left, end the call
//         if (callParticipants.size === 0) {
//           this.activeCalls.delete(conversationId);
//         }
//       }
//
//       // Remove from user's active calls
//       this.userCalls.delete(Number(userId));
//
//       // Leave the socket room
//       const roomName = `call:${conversationId}`;
//       client.leave(roomName);
//
//       // Notify others that user left
//       this.server.to(roomName).emit('userLeftCall', {
//         userId: Number(userId),
//         conversationId,
//       });
//
//       return {
//         event: 'leftCall',
//         data: { success: true, conversationId },
//       };
//     } catch (error) {
//       console.error('Leave call error:', error);
//       return { error: 'Failed to leave call' };
//     }
//   }
//
//   @UseGuards(WsJwtGuard)
//   @SubscribeMessage('signalData')
//   handleSignalData(
//     @MessageBody()
//     data: {
//       to: number;
//       signal: any;
//       conversationId: number;
//     },
//     @ConnectedSocket() client: Socket,
//   ) {
//     const userId = client.handshake.auth.userId;
//
//     try {
//       // Forward the WebRTC signaling data to the specific user
//       const roomName = `call:${data.conversationId}`;
//       this.server.to(roomName).emit('signalData', {
//         from: Number(userId),
//         signal: data.signal,
//         to: data.to,
//       });
//
//       return { success: true };
//     } catch (error) {
//       console.error('Signal data error:', error);
//       return { error: 'Failed to send signal data' };
//     }
//   }
// }
