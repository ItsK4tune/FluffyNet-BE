import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Message } from '../../message/entities/message.entity';
import { Member } from '../../chat_member/entities/member.entity';
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
