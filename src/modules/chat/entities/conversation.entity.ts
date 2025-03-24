import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Member } from '../../conversation_member/entities/member.entity';
import { Message } from '../../message/entities/message.entity';
// import { ConversationEnum } from '../../../utils/enums/message.enum';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  type: string; // 'group' | 'direct'

  @Column()
  created_at: Date;

  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  messages: Message[];

  @OneToMany(() => Member, (member) => member.conversation, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  members: Member[];
}
