import { ConnectedSocket, MessageBody, OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class NotificationGateway implements OnGatewayConnection{
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    
    if (!userId) {
      client.disconnect();
      return;
    }

    client.join(`user_${userId}`);
    this.connectedUsers.set(userId, client.id);
    console.log(`Client connected: ${client.id}, userId: ${client.handshake.query.userId}`);
    client.emit('connected');
  }

  sendNotification(userId: number, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }
}