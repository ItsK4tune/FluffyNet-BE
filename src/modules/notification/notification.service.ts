import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schema/notification.schema';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private readonly notificationGateway: NotificationGateway
  ) { }

  async createNotification(user_id: number, type: string, body: any) {
    const notification = new this.notificationModel({ user_id, type, body });
    await notification.save();

    this.notificationGateway.sendNotification(user_id, { type, body });
  }

  async getUserNotifications(user_id: number) {
    return this.notificationModel.find({ user_id }).sort({ createdAt: -1 }).exec();
  }

  async getUnreadNotifications(user_id: number) {
    return this.notificationModel
      .find({ user_id, opened: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsOpened(notificationId: string) {
    return this.notificationModel.findByIdAndUpdate(
      notificationId,
      { opened: true },
      { new: true },
    );
  }

  async markAllAsOpen(user_id: number) {
    return this.notificationModel.updateMany(
      { user_id, opened: false },
      { $set: { opened: true } },
    );
  }
}
