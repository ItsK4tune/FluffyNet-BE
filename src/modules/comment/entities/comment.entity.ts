import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
  RelationCount,
} from 'typeorm';
import { Profile } from 'src/modules/profile/entities/profile.entity';
import { Like } from 'src/modules/like/entity/like.entity';
import { Post } from 'src/modules/post/entities/post.entity';
import { Status } from 'src/utils/enums/enum';

@Entity('comment')
export class Comment {
  @PrimaryGeneratedColumn()
  comment_id: number;

  @Column()
  user_id: number;

  @Column()
  post_id: number;

  @Index()
  @Column({ nullable: true })
  parent_id?: number;

  @Column({ nullable: true })
  body: string;

  @Column({ nullable: true })
  image?: string;

  @Column({ nullable: true })
  video?: string;

  @Column({ nullable: true })
  video_thumbnail?: string;

  @Column({ default: Status.processing })
  video_status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Profile, (profile) => profile.user_id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  profile: Profile;

  @ManyToOne(() => Comment, (comment) => comment.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parentComment?: Comment;

  @ManyToOne(() => Post, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @OneToMany(() => Like, (like) => like.comment)
  likes: Like[];

  @RelationCount((comment: Comment) => comment.likes)
  like_count: number;

  @OneToMany(() => Comment, (comment) => comment.parentComment)
  replies: Comment[];
}
