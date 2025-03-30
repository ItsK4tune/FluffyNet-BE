import {
  Column, CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from '../../chat/entities/conversation.entity';
import { Message } from '../../message/entities/message.entity';
import { Profile } from '../../profile/entities/profile.entity';

@Entity('member')
export class Member {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  conversation_id: number;

  @Column({ nullable: true })
  nickname: string;

  @Column()
  role: string; // 'admin' | 'member'

  @Column()
  type: string; // 'active' | 'pending' | 'removed' | 'left' | 'blocked'

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @ManyToOne(() => Profile, (user) => user.members)
  @JoinColumn({ name: 'user_id' })
  user: Profile;

  @ManyToOne(() => Conversation, (conversation) => conversation.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @OneToMany(() => Message, (message) => message.sender, {
    onDelete: 'CASCADE',
  })
  messages: Message[];
}
