// import { Repository } from 'typeorm';
// import { Notify } from './entities/notification.entity';
//
// export class NotificationRepository {
//   constructor(private readonly repo: Repository<Notify>) {}
//
//   async save(notification: Notify) {
//     return this.repo.save(notification);
//   }
//
//   async getNotifications(user_id: number, lastNotificationId: number) {
//     const whereCondition: any = { user_id };
//
//     if (lastNotificationId) {
//       whereCondition.id = lastNotificationId;
//     }
//
//     return this.repo.find({
//       where: whereCondition,
//       order: { created_at: 'DESC' },
//       take: 20,
//     });
//   }
//
//   async markAllAsRead(user_id) {
//     return this.repo.update({ user_id }, { read: true });
//   }
// }
