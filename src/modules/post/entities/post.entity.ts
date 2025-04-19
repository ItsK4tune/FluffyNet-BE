import { Comment } from 'src/modules/comment/entities/comment.entity';
import { Like } from 'src/modules/like/entity/like.entity';
import { Profile } from 'src/modules/profile/entities/profile.entity';
import { Status } from 'src/utils/enums/enum';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationCount, UpdateDateColumn } from 'typeorm';

@Entity('post')
export class Post {
  @PrimaryGeneratedColumn()
  post_id: number;

  @Column()
  user_id: number;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ nullable: true })
  image: string | null;

  @Column({ nullable: true })
  video: string | null;

  @Column({ nullable: true })
  video_thumbnail: string | null;

  @Column({ default: Status.processing })
  video_status: string;

  @Index()
  @Column({ nullable: true })
  repost_id: number | null;

  @Column({ type: 'boolean', default: false })
  is_repost_deleted: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
  
  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => Like, (like) => like.post)
  likes: Like[];

  @RelationCount((post: Post) => post.likes)
  like_count: number;
 
  @OneToMany(() => Post, (post) => post.repostOrigin)
  reposts: Post[];

  @ManyToOne(() => Profile, (profile) => profile.posts, { onDelete: "CASCADE" })
  @JoinColumn({ name: 'user_id' })
  user: Profile;  

  @ManyToOne(() => Post, (post) => post.reposts, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: 'repost_id' })
  repostOrigin: Post;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @RelationCount((post: Post) => post.comments)
  comments_count: number;

  @RelationCount((post: Post) => post.reposts)
  shares_count: number;
}
