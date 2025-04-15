import {
  Entity,
  Column,
  PrimaryColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Account } from 'src/modules/authen/entities/account.entity';
import { Follow } from 'src/modules/follow/entities/follow.entity';
import { Like } from 'src/modules/like/entity/like.entity';
import { Member } from '../../chat-member/entities/member.entity';

@Entity('profile')
export class Profile {
  @PrimaryColumn()
  user_id: number;

  @Column({ nullable: true, default: 'New Fluffizen' })
  name: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  background: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  hobby: string;

  @Column({ nullable: true })
  socialLink: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => Follow, (follow) => follow.follower)
  following: Follow[];

  @OneToMany(() => Follow, (follow) => follow.following)
  followers: Follow[];

  @OneToMany(() => Like, (like) => like.user_id)
  likes: Like[];

  @OneToOne(() => Account, (account) => account.profile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: Account;

  @OneToMany(() => Member, (member) => member.user, {
    onDelete: 'CASCADE',
  })
  members: Member[];
}
