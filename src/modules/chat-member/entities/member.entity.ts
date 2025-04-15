import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ChatRoom } from '../../chat-room/entities/room.entity';
import { Message } from '../../message/entities/message.entity';
import { Profile } from '../../profile/entities/profile.entity';

@Entity('member')
export class Member {
  @PrimaryGeneratedColumn()
  member_id: number;

  @Column()
  user_id: number;

  @Column()
  room_id: number;

  @Column({ nullable: true })
  nickname: string;

  @Column({ default: 'member' })
  role: string; // 'admin' | 'member'

  @Column({ default: 'active' })
  type: string; // 'active' | 'pending' | 'removed' | 'left' | 'blocked'

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @ManyToOne(() => Profile, (user) => user.members)
  @JoinColumn({ name: 'user_id' })
  user: Profile;

  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'room_id' })
  chatRoom: ChatRoom;

  @OneToMany(() => Message, (message) => message.member, {
    onDelete: 'CASCADE',
  })
  messages: Message[];
}
