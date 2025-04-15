import {
  Entity,
  ManyToOne,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from '../../chat-member/entities/member.entity';
import { ChatRoom } from '../../chat-room/entities/room.entity';

@Entity('message')
export class Message {
  @PrimaryGeneratedColumn()
  message_id: number;

  @Column()
  room_id: number;

  @Column()
  member_id: number;

  @Column({ nullable: true, default: null })
  body: string;

  @Column({ nullable: true, default: null })
  file: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @ManyToOne(() => Member, (member) => member.messages)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.messages, {
    onDelete: 'CASCADE',
    // cascade: true,
  })
  @JoinColumn({ name: 'room_id' })
  chatRoom: ChatRoom;
}
