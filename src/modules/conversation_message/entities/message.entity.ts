import { Entity, ManyToOne, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Conversation } from '../../conversation/entities/conversation.entity';
import { Member } from '../../conversation_member/entities/member.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversationId: number;

  @Column()
  senderId: number;

  @Column({ nullable: true })
  content: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  videoUrl: string;

  @Column({ nullable: true })
  audioUrl: string;

  @Column({ nullable: true })
  fileUrl: string;

  @Column()
  createdAt: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  conversation: Conversation;

  @ManyToOne(() => Member, (member) => member.messages, {
    onDelete: 'CASCADE',
  })
  sender: Member;
}
