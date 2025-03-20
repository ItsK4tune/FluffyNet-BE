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
// import { MemberService } from '../conversation_member/member.service';
// import { WsJwtGuard } from 'src/guards/websocket.jwt.guard';
// import { AddMemberDto, MemberUpdateDto } from '../conversation_member/dtos/member.dtos';
//
// @WebSocketGateway({
//   cors: {
//     origin: '*',
//   },
//   namespace: '/chat',
// })
// export class MemberGateway implements OnGatewayConnection, OnGatewayDisconnect {
//   @WebSocketServer() server: Server;
//
//   // Track connected users
//   private connectedUsers = new Map<number, Socket>();
//
//   constructor(private readonly memberService: MemberService) {}
//
//   async handleConnection(client: Socket) {
//     console.log(`Client connected to member gateway: ${client.id}`);
//
//     try {
//       const userId = client.handshake.auth.userId;
//
//       if (!userId) {
//         client.disconnect();
//         return;
//       }
//
//       // Store the connected user
//       this.connectedUsers.set(Number(userId), client);
//     } catch (error) {
//       console.error('Connection error in member gateway:', error);
//       client.disconnect();
//     }
//   }
//
//   handleDisconnect(client: Socket) {
//     console.log(`Client disconnected from member gateway: ${client.id}`);
//
//     // Remove user from tracking map
//     for (const [userId, socket] of this.connectedUsers.entries()) {
//       if (socket.id === client.id) {
//         this.connectedUsers.delete(userId);
//         break;
//       }
//     }
//   }
//
//   // @UseGuards(WsJwtGuard)
//   // @SubscribeMessage('addMember')
//   // async handleAddMember(
//   //   @MessageBody() data: AddMemberDto,
//   //   @ConnectedSocket() client: Socket,
//   // ) {
//   //   const userId = client.handshake.auth.userId;
//   //
//   //   try {
//   //     const newMember = await this.memberService.addMember(
//   //       data,
//   //       Number(userId)
//   //     );
//   //
//   //     // Notify the room about the new member
//   //     const roomName = `conversation:${data.conversationId}`;
//   //     this.server.to(roomName).emit('memberAdded', newMember);
//   //
//   //     // Also notify the added user if they're online
//   //     const addedUserSocket = this.connectedUsers.get(Number(data.userId));
//   //     if (addedUserSocket) {
//   //       addedUserSocket.emit('addedToConversation', {
//   //         conversationId: data.conversationId,
//   //         role: data.role
//   //       });
//   //     }
//   //
//   //     return {
//   //       event: 'memberAdded',
//   //       data: { success: true, member: newMember },
//   //     };
//   //   } catch (error) {
//   //     console.error('Add member error:', error);
//   //     return { error: 'Failed to add member' };
//   //   }
//   // }
//
//   @UseGuards(WsJwtGuard)
//   @SubscribeMessage('updateMember')
//   async handleUpdateMember(
//     @MessageBody() data: MemberUpdateDto & { memberId: number },
//     @ConnectedSocket() client: Socket,
//   ) {
//     const userId = client.handshake.auth.userId;
//     const { memberId, ...updateData } = data;
//
//     try {
//       const updatedMember = await this.memberService.updateMember(
//         memberId,
//         updateData,
//         Number(userId),
//       );
//
//       // Notify the room about the updated member
//       const roomName = `conversation:${updatedMember.conversationId}`;
//       this.server.to(roomName).emit('memberUpdated', updatedMember);
//
//       return {
//         event: 'memberUpdated',
//         data: { success: true, member: updatedMember },
//       };
//     } catch (error) {
//       console.error('Update member error:', error);
//       return { error: 'Failed to update member' };
//     }
//   }
//
//   @UseGuards(WsJwtGuard)
//   @SubscribeMessage('removeMember')
//   async handleRemoveMember(
//     @MessageBody() data: { memberId: number, conversationId: number },
//     @ConnectedSocket() client: Socket,
//   ) {
//     const userId = client.handshake.auth.userId;
//     const { memberId, conversationId } = data;
//
//     try {
//       const removedMember = await this.memberService.removeMember(
//         memberId,
//         Number(userId),
//       );
//
//       // Notify the room about the removed member
//       const roomName = `conversation:${conversationId}`;
//       this.server.to(roomName).emit('memberRemoved', removedMember);
//
//       // Also notify the removed user if they're online
//       if (removedMember && removedMember.userUserId) {
//         const removedUserSocket = this.connectedUsers.get(
//           Number(removedMember.userUserId),
//         );
//         if (removedUserSocket) {
//           removedUserSocket.emit('removedFromConversation', {
//             conversationId: conversationId,
//           });
//         }
//       }
//
//       return {
//         event: 'memberRemoved',
//         data: { success: true, member: removedMember },
//       };
//     } catch (error) {
//       console.error('Remove member error:', error);
//       return { error: 'Failed to remove member' };
//     }
//   }
//
//   @UseGuards(WsJwtGuard)
//   @SubscribeMessage('leaveConversation')
//   async handleLeaveConversation(
//     @MessageBody() data: { conversationId: number },
//     @ConnectedSocket() client: Socket,
//   ) {
//     const userId = client.handshake.auth.userId;
//     const { conversationId } = data;
//
//     try {
//       await this.memberService.leaveConversation(
//         conversationId,
//         Number(userId),
//       );
//
//       // Notify the room that the user left
//       const roomName = `conversation:${conversationId}`;
//       this.server.to(roomName).emit('memberLeft', {
//         userId: Number(userId),
//         conversationId,
//       });
//
//       // Leave the socket room
//       client.leave(roomName);
//
//       return {
//         event: 'leftConversation',
//         data: { success: true, conversationId },
//       };
//     } catch (error) {
//       console.error('Leave conversation error:', error);
//       return { error: 'Failed to leave conversation' };
//     }
//   }
// }
