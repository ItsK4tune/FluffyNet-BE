// import { Injectable } from '@nestjs/common';
// import { NotificationRepository } from './notification.repository';
// import { MemberService } from '../chat_member/member.service';
// import { Notify } from './entities/notification.entity';
//
// @Injectable()
// export class NotificationService {
//   constructor(
//     private readonly notificationRepository: NotificationRepository,
//     private readonly memberService: MemberService,
//   ) {}
//
//   async createNotification(
//     notificationDto: CreateNotificationDto,
//     userId: number,
//   ) {
//     const notification = Object.assign(new Notify(), {
//       ...notificationDto,
//       user_id: userId,
//       created_at: new Date(),
//     });
//
//     return await this.notificationRepository.save(notification);
//   }
//
//   async getNotifications(userId: number, lastNotificationId: number) {
//     return await this.notificationRepository.getNotifications(
//       userId,
//       lastNotificationId,
//     );
//   }
//
//   async markAllAsRead(user_id) {
//     await this.notificationRepository.markAllAsRead(user_id);
//   }
// }
