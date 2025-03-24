import { Entity, ManyToOne, Column, PrimaryGeneratedColumn, JoinColumn } from "typeorm";
import { Conversation } from '../../chat/entities/conversation.entity';
import { Member } from '../../conversation_member/entities/member.entity';

@Entity('message')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversation_id: number;

  @Column()
  sender_id: number;

  @Column({ nullable: true })
  body: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  video: string;

  @Column({ nullable: true })
  audio: string;

  @Column({ nullable: true })
  file: string;

  @Column()
  created_at: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => Member, (member) => member.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sender_id' })
  sender: Member;
}
