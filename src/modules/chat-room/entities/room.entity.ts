import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Message } from '../../message/entities/message.entity';
import { Member } from '../../chat-member/entities/member.entity';

@Entity('chat_room')
export class ChatRoom {
  @PrimaryGeneratedColumn()
  room_id: number;

  @Column({ default: 'Direct' })
  name: string;

  @Column({ default: 'direct' })
  type: string; // 'group' | 'direct'

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @OneToMany(() => Message, (message) => message.chatRoom, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  messages: Message[];

  @OneToMany(() => Member, (member) => member.chatRoom, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  members: Member[];
}
