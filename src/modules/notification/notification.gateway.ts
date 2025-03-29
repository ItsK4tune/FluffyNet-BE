import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  sendNotification(userId: number, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }
}