import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true, type: Object })
  body: Record<string, any>;

  @Prop({ required: true })
  user_id: number;

  @Prop({ default: false })
  opened: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
