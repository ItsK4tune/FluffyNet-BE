import { UserProfile } from '../../profile/entities/user-profile.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from '../../conversation/entities/conversation.entity';
import { Message } from '../../conversation_message/entities/message.entity';

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userUserId: number;

  @Column()
  conversationId: number;

  @Column()
  avatarUrl: string;

  @Column()
  username: string;

  @Column()
  nickname: string;

  @Column()
  role: string; // 'admin' | 'member'

  @Column()
  type: string; // 'active' | 'pending' | 'removed' | 'left'

  @Column()
  createdAt: Date;

  @ManyToOne(() => UserProfile, (user) => user.members)
  user: UserProfile;

  @ManyToOne(() => Conversation, (conversation) => conversation.members, {
    onDelete: 'CASCADE',
  })
  conversation: Conversation;

  @OneToMany(() => Message, (message) => message.sender, {
    onDelete: 'CASCADE',
  })
  messages: Message[];
}
