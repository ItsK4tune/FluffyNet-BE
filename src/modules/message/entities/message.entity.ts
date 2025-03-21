import { Entity, ManyToOne, Column, PrimaryGeneratedColumn } from 'typeorm';
// import { Conversation } from '../../conversation/entities/conversation.entity';
// import { Member } from '../../conversation_member/entities/member.entity';

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
  createdAt: Date;

//   @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
//     onDelete: 'CASCADE',
//   })
//   conversation: Conversation;

//   @ManyToOne(() => Member, (member) => member.messages, {
//     onDelete: 'CASCADE',
//   })
//   sender: Member;
}
