// // jobs/notification/notification-queue.module.ts
// import { Module } from '@nestjs/common';
// import { BullModule } from '@nestjs/bull';
// import { NotificationQueueProcessor } from './notification-queue.processor';
// import { NotificationQueueService } from './notification-queue.service';
// import { SocketClientsService } from '../../shared/services/socket-clients.service';
// import { NotificationsModule } from '../../modules/notifications/notifications.module';
//
// @Module({
//   imports: [
//     BullModule.registerQueue({
//       name: 'notifications-queue',
//       defaultJobOptions: {
//         attempts: 3,
//         backoff: {
//           type: 'exponential',
//           delay: 1000,
//         },
//         removeOnComplete: true,
//       },
//     }),
//     NotificationsModule,
//   ],
//   providers: [
//     NotificationQueueProcessor,
//     NotificationQueueService,
//     SocketClientsService,
//   ],
//   exports: [NotificationQueueService],
// })
// export class NotificationQueueModule {}
