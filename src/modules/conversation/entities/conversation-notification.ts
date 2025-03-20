// import { Conversation } from "./conversation.entity";
//
// import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
//
// @Entity('conversation_notifications')
// export class ConversationNotification {
//   @PrimaryGeneratedColumn()
//   id: number;
//
//   @Column()
//   message: string;
//
//   @Column()
//   createdAt: Date;
//
//   @Column()
//   createdBy: string;
//
//   // @ManyToOne(() => Conversation, (conversation) => conversation.notifications)
//   // conversation: Conversation;
// }