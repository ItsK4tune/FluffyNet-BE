import {
  Entity,
  Column,
  PrimaryColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
  RelationCount,
} from 'typeorm';
import { Account } from 'src/modules/authen/entities/account.entity';
import { Follow } from 'src/modules/follow/entities/follow.entity';
import { Like } from 'src/modules/like/entity/like.entity';
import { Member } from '../../chat-member/entities/member.entity';
import { Post } from 'src/modules/post/entities/post.entity';
import { Comment } from 'src/modules/comment/entities/comment.entity';

@Entity('profile')
export class Profile {
  @PrimaryColumn()
  user_id: number;

  @Column({ nullable: true })
  nickname: string;
  
  @Column({ nullable: true })
  realname: string;
  
  @Column({ type: 'text', nullable: true })
  bio: string;
  
  @Column({ nullable: true })
  dob: Date;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  background: string;
 
  @Column({ nullable: true })
  theme: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  hobby: string;

  @Column({ nullable: true })
  socialLink: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => Follow, (follow) => follow.follower)
  followings: Follow[];

  @RelationCount((profile: Profile) => profile.followings)
  following_count: number;

  @OneToMany(() => Follow, (follow) => follow.following)
  followers: Follow[];

  @RelationCount((profile: Profile) => profile.followers)
  follower_count: number;

  @OneToMany(() => Post, (post) => post.user, { cascade: true })
  posts: Post[];

  @RelationCount((profile: Profile) => profile.posts)
  posts_count: number;

  @OneToMany(() => Like, (like) => like.user_id)
  likes: Like[];

  @OneToMany(() => Comment, (comment) => comment.profile, { onDelete: 'CASCADE' })
  comments: Comment;

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
